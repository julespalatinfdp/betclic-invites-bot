const {
  SlashCommandBuilder, PermissionFlagsBits,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-invite-panel')
    .setDescription('Poste le panneau du concours d\'invitations (admin)')
    .addChannelOption(o =>
      o.setName('channel')
        .setDescription('Canal où poster le panneau (par défaut : ici)')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, db) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Réservé aux admins.', flags: MessageFlags.Ephemeral });
    }

    const channel = interaction.options.getChannel('channel') || interaction.channel;

    const content =
      '## 🏆 Concours d\'invitations\n\n' +
      '**Invite tes amis, grimpe au classement, gagne des récompenses !**\n\n' +
      '🗓️ **Concours hebdomadaire** : les résultats sont postés **chaque mercredi**.\n\n' +
      '**🎁 À gagner chaque semaine (tout en feebets*) :**\n' +
      '🥇 1er : **30 €**\n' +
      '🥈 2e : **20 €**\n' +
      '🥉 3e : **10 €**\n' +
      '🎲 **10 €** pour un membre tiré au sort parmi ceux qui ont invité **5 amis ou plus**\n\n' +
      '**Comment participer ?**\n' +
      '1️⃣ Clique sur **🔗 Mon lien perso** ci-dessous pour recevoir ton lien d\'invitation personnel.\n' +
      '2️⃣ Partage-le à tes amis : chaque personne qui rejoint le serveur avec **ton** lien est comptée pour toi.\n' +
      '3️⃣ Suis ta progression à tout moment avec **📊 Mes stats**.\n\n' +
      '⚠️ Ton lien est **permanent** : c\'est toujours le même, tu peux revenir le chercher ici quand tu veux.\n\n' +
      'Bonne chance ! 🍀\n\n' +
      '-# *Feebets = crédits de jeu non retirables\n' +
      '-# Règlement disponible dans https://discord.com/channels/1496844272610185216/1496844603163279430';

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('invite:getlink')
        .setLabel('🔗 Mon lien perso')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('invite:stats')
        .setLabel('📊 Mes stats')
        .setStyle(ButtonStyle.Secondary),
    );

    await channel.send({ content, components: [row] });
    return interaction.reply({ content: `✅ Panneau posté dans <#${channel.id}>.`, flags: MessageFlags.Ephemeral });
  },
};
