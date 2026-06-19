const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('my-invites')
    .setDescription('Voir le nombre d\'invitations que tu as ramené'),

  async execute(interaction, db) {
    await interaction.deferReply();

    try {
      const userId = interaction.user.id;
      const count = await db.getInviteCount(userId);

      // Obtenir le classement pour voir la position
      const leaderboard = await db.getLeaderboard();
      let position = 0;
      for (let i = 0; i < leaderboard.length; i++) {
        if (leaderboard[i].inviter_id === userId) {
          position = i + 1;
          break;
        }
      }

      const embed = new EmbedBuilder()
        .setColor('#00D4FF')
        .setTitle(`📊 Tes Invitations - ${interaction.user.username}`)
        .addFields(
          { name: '🔗 Total d\'invitations', value: `${count}`, inline: true },
          { name: '🏅 Classement', value: position > 0 ? `#${position}` : 'Pas encore classé', inline: true }
        )
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.editReply({
        content: '❌ Une erreur est survenue.',
      });
    }
  },
};
