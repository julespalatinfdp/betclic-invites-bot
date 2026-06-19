const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('invites-ranking')
    .setDescription('Affiche le top 10 des membres qui ont ramené le plus d\'invitations'),

  async execute(interaction, db) {
    await interaction.deferReply();

    try {
      const leaderboard = await db.getLeaderboard(10);
      const guild = interaction.guild;

      if (leaderboard.length === 0) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor('#FF6B6B')
              .setTitle('🏆 Classement des Invitations')
              .setDescription('Aucune invitation enregistrée pour le moment.')
              .setTimestamp(),
          ],
        });
      }

      // Construire l'embed avec le top 10
      let description = '';
      const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

      for (let i = 0; i < leaderboard.length; i++) {
        const row = leaderboard[i];
        const user = await guild.members.fetch(row.inviter_id).catch(() => null);
        const username = user ? user.user.username : 'Unknown User';
        
        description += `${medals[i]} **${username}** - ${row.count} invitation${row.count > 1 ? 's' : ''}\n`;
      }

      const embed = new EmbedBuilder()
        .setColor('#00D4FF')
        .setTitle('🏆 Classement des Invitations')
        .setDescription(description)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.editReply({
        content: '❌ Une erreur est survenue lors de la récupération du classement.',
      });
    }
  },
};
