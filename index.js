require('dotenv').config();
const { Client, GatewayIntentBits, Collection, ActivityType, MessageFlags, EmbedBuilder } = require('discord.js');
const Database = require('./db/database.js');
const fs = require('fs');
const path = require('path');

// ─────────────────────────────────────────────────────────────
// FILETS DE SÉCURITÉ : le process ne meurt JAMAIS sur une erreur isolée
// ─────────────────────────────────────────────────────────────
process.on('unhandledRejection', (err) => console.error('[unhandledRejection]', err));
process.on('uncaughtException',  (err) => console.error('[uncaughtException]', err));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.DirectMessages,
  ],
});

client.on('error', (err) => console.error('[client error]', err));
client.on('warn',  (msg) => console.warn('[client warn]', msg));

const GUILD_ID = process.env.GUILD_ID;
// Canal vers lequel pointent les liens perso (salon d'accueil)
const INVITE_CHANNEL_ID = process.env.INVITE_CHANNEL_ID || '1496844915039010857';
// ⚠️ Sur Railway, définis DB_PATH=/app/data/invites.db (volume) pour la persistance
const db = new Database(process.env.DB_PATH || './invites.db');

// Collections pour les commandes et invites
client.commands = new Collection();
client.invites = new Map();

// Charger les commandes
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  client.commands.set(command.data.name, command);
}

// EVENT: Bot prêt
client.on('ready', async () => {
  console.log(`✅ Bot connecté en tant que ${client.user.tag}`);
  await db.initialize();
  console.log('📊 Base de données initialisée');

  const guild = client.guilds.cache.get(GUILD_ID);
  if (guild) {
    try {
      const invites = await guild.invites.fetch();
      console.log(`📸 Snapshot initial: ${invites.size} invitations détectées`);
      for (const [code, invite] of invites) {
        client.invites.set(code, invite.uses);
      }
    } catch (error) {
      console.error('❌ Erreur lors du snapshot des invites:', error);
    }
  }

  client.user.setActivity('les invitations 🔗', { type: ActivityType.Watching });
});

// EVENT: Nouvelle invitation créée
client.on('inviteCreate', async (invite) => {
  if (invite.guildId !== GUILD_ID) return;
  client.invites.set(invite.code, invite.uses || 0);
  console.log(`📌 Nouvelle invite créée: ${invite.code} (${invite.uses || 0} uses)`);
});

// EVENT: Invitation supprimée (on nettoie le cache)
client.on('inviteDelete', (invite) => {
  if (invite.guildId !== GUILD_ID) return;
  client.invites.delete(invite.code);
});

// EVENT: Nouveau membre rejoint
// NOUVEAU MODÈLE : on identifie le CODE utilisé, puis :
//   1) si le code appartient à un membre (table invite_codes) → on crédite ce membre
//   2) sinon, fallback sur l'inviter natif (invites créées à la main)
client.on('guildMemberAdd', async (member) => {
  if (member.guild.id !== GUILD_ID) return;

  try {
    const invites = await member.guild.invites.fetch();

    for (const [code, invite] of invites) {
      const oldUses = client.invites.get(code) || 0;
      const newUses = invite.uses || 0;

      if (newUses > oldUses) {
        // Ce code a été utilisé
        client.invites.set(code, newUses);

        // 1) Le code est-il le lien perso d'un membre ?
        const ownerId = await db.getUserByCode(code);
        if (ownerId) {
          if (ownerId !== member.id) {
            await db.addInvite(ownerId, member.id);
            console.log(`✅ [lien perso] <${ownerId}> a invité ${member.user.username} via ${code}`);
          } else {
            console.log(`↩️  ${member.user.username} a utilisé son propre lien, non compté.`);
          }
          break;
        }

        // 2) Fallback : inviter natif (invitation créée manuellement)
        const inviter = invite.inviter;
        if (inviter && !inviter.bot) {
          await db.addInvite(inviter.id, member.id);
          console.log(`✅ [invite native] ${inviter.username} a invité ${member.user.username}`);
        }
        break;
      }
    }
  } catch (error) {
    console.error('❌ Erreur lors du traitement de l\'invitation:', error);
  }
});

// ─────────────────────────────────────────────────────────────
// EVENT: Interactions (slash commands + boutons du panneau concours)
// ─────────────────────────────────────────────────────────────
client.on('interactionCreate', async (interaction) => {
  try {

    // ── BOUTONS DU PANNEAU ──────────────────
    if (interaction.isButton()) {

      // Bouton 1 : recevoir son lien perso (stable)
      if (interaction.customId === 'invite:getlink') {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        // Déjà un lien ? On renvoie TOUJOURS le même.
        let code = await db.getUserCode(interaction.user.id);

        if (!code) {
          // Première demande : on crée une invite permanente et on la stocke
          const channel = await interaction.guild.channels.fetch(INVITE_CHANNEL_ID);
          const invite  = await channel.createInvite({
            maxAge: 0,        // n'expire jamais
            maxUses: 0,       // usages illimités
            unique: true,     // force une nouvelle invite (pas de réutilisation)
            reason: `Lien concours de ${interaction.user.username} (${interaction.user.id})`,
          });
          code = invite.code;
          await db.setUserCode(interaction.user.id, code);
          client.invites.set(code, 0);
          console.log(`🔗 Lien perso créé pour ${interaction.user.username} : ${code}`);
        }

        return await interaction.editReply({
          content:
            `🔗 **Ton lien d'invitation personnel :**\n` +
            `https://discord.gg/${code}\n\n` +
            `Partage-le : chaque personne qui rejoint avec ce lien est comptée pour toi. ` +
            `Ce lien est permanent — il ne changera pas, tu peux revenir le chercher ici quand tu veux.`,
        });
      }

      // Bouton 2 : mes stats + mon rang
      if (interaction.customId === 'invite:stats') {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const count = await db.getInviteCount(interaction.user.id);
        const rank  = await db.getRank(interaction.user.id);
        const total = await db.getParticipantCount();

        const embed = new EmbedBuilder()
          .setColor(0xE10014)
          .setTitle('📊 Tes invitations')
          .setDescription(
            count === 0
              ? `Tu n'as pas encore d'invitation comptée.\nRécupère ton lien perso avec le bouton 🔗 et partage-le !`
              : `**Invitations : ${count}**\n**Rang : ${rank}${rank === 1 ? ' 🥇' : rank === 2 ? ' 🥈' : rank === 3 ? ' 🥉' : ''}** sur ${total} participant${total > 1 ? 's' : ''}`
          );

        return await interaction.editReply({ embeds: [embed] });
      }

      return; // autre bouton inconnu : on ignore
    }

    // ── SLASH COMMANDS ──────────────────────
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction, db);
    } catch (error) {
      console.error(error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: '❌ Une erreur est survenue!' }).catch(() => {});
      } else {
        await interaction.reply({ content: '❌ Une erreur est survenue!', flags: MessageFlags.Ephemeral }).catch(() => {});
      }
    }

  } catch (e) {
    // Erreur d'interaction (ex. 10062) : on log, on NE crash PAS.
    console.error('[interactionCreate]', e);
    try {
      if (!interaction.replied && !interaction.deferred && interaction.isRepliable?.()) {
        await interaction.reply({ content: '❌ Une erreur est survenue, réessaie.', flags: MessageFlags.Ephemeral });
      }
    } catch (_) { /* token mort : on ignore */ }
  }
});

// Connexion du bot
client.login(process.env.DISCORD_TOKEN);

module.exports = client;
