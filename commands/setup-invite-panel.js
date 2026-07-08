const {
  SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder,
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

    const embed = new EmbedBuilder()
      .setColor(0xE10014)
      .setTitle('🏆 Concours d\'invitations')
      .setDescription(
        '**Invite tes amis, grimpe au classement, gagne des récompenses !**\n\n' +
        '**Comment participer ?**\n' +
        '1️⃣ Clique sur **🔗 Mon lien perso** ci-dessous pour recevoir ton lien d\'invitation personnel.\n' +
        '2️⃣ Partage-le à tes amis : chaque personne qui rejoint le serveur avec **ton** lien est comptée pour toi.\n' +
        '3️⃣ Suis ta progression à tout moment avec **📊 Mes stats**.\n\n' +
        '⚠️ Ton lien est **permanent** : c\'est toujours le même, tu peux revenir le chercher ici quand tu veux.\n\n' +
        'Bonne chance ! 🍀'
      );

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

    await channel.send({ embeds: [embed], components: [row] });
    return interaction.reply({ content: `✅ Panneau posté dans <#${channel.id}>.`, flags: MessageFlags.Ephemeral });
  },
};
