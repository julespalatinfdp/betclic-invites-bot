require('dotenv').config();
const { Client, GatewayIntentBits, Collection, ActivityType } = require('discord.js');
const Database = require('./db/database.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.DirectMessages,
  ],
});

const GUILD_ID = process.env.GUILD_ID;
const db = new Database('./invites.db');

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

  // Initialiser la DB
  await db.initialize();
  console.log('📊 Base de données initialisée');

  // Faire le snapshot initial des invites
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

  // Statut du bot
  client.user.setActivity('les invitations 🔗', { type: ActivityType.Watching });
});

// EVENT: Nouvelle invitation créée
client.on('inviteCreate', async (invite) => {
  if (invite.guildId !== GUILD_ID) return;
  client.invites.set(invite.code, invite.uses);
  console.log(`📌 Nouvelle invite créée: ${invite.code} (${invite.uses || 0} uses)`);
});

// EVENT: Nouveau membre rejoint
client.on('guildMemberAdd', async (member) => {
  if (member.guild.id !== GUILD_ID) return;
  
  try {
    const invites = await member.guild.invites.fetch();
    
    // Trouver quelle invite a été utilisée
    for (const [code, invite] of invites) {
      const oldUses = client.invites.get(code) || 0;
      const newUses = invite.uses || 0;
      
      if (newUses > oldUses) {
        // Cette invite a été utilisée!
        const inviter = invite.inviter;
        
        if (inviter && !inviter.bot) {
          // Enregistrer dans la DB
          await db.addInvite(inviter.id, member.id);
          console.log(`✅ ${inviter.username} a invité ${member.username}`);
        }
        
        // Mettre à jour le cache
        client.invites.set(code, newUses);
        break;
      }
    }
  } catch (error) {
    console.error('❌ Erreur lors du traitement de l\'invitation:', error);
  }
});

// EVENT: Commandes slash
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, db);
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: '❌ Une erreur est survenue!',
      ephemeral: true,
    });
  }
});

// Connexion du bot
client.login(process.env.DISCORD_TOKEN);

module.exports = client;
