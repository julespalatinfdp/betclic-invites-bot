const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('export-invites')
    .setDescription('Exporte le classement complet des invitations en CSV'),

  async execute(interaction, db) {
    await interaction.deferReply();

    try {
      const allInvites = await db.getAllInvites();
      const guild = interaction.guild;

      // Obtenir le classement pour le résumé
      const leaderboard = await db.getLeaderboard();

      // Préparer le CSV avec le résumé par inviter
      let csvContent = 'Rang,Utilisateur,Invitations\n';

      for (let i = 0; i < leaderboard.length; i++) {
        const row = leaderboard[i];
        const user = await guild.members.fetch(row.inviter_id).catch(() => null);
        const username = user ? user.user.username : `Unknown (${row.inviter_id})`;
        
        csvContent += `${i + 1},"${username}",${row.count}\n`;
      }

      // Ajouter une section détaillée des invitations
      csvContent += '\n\n--- DÉTAIL DES INVITATIONS ---\n';
      csvContent += 'Inviteur,Membre Invité,Date\n';

      for (const invite of allInvites) {
        const inviter = await guild.members.fetch(invite.inviter_id).catch(() => null);
        const invited = await guild.members.fetch(invite.invited_member_id).catch(() => null);
        
        const inviterName = inviter ? inviter.user.username : `Unknown (${invite.inviter_id})`;
        const invitedName = invited ? invited.user.username : `Unknown (${invite.invited_member_id})`;
        const date = new Date(invite.created_at).toLocaleString('fr-FR');

        csvContent += `"${inviterName}","${invitedName}","${date}"\n`;
      }

      // Créer le fichier
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `betclic-invites-${timestamp}.csv`;
      const filepath = path.join(__dirname, '..', filename);

      fs.writeFileSync(filepath, csvContent, 'utf-8');

      // Envoyer le fichier
      const attachment = new AttachmentBuilder(filepath, { name: filename });
      await interaction.editReply({
        content: `✅ Export complet des invitations (${leaderboard.length} invitateurs, ${allInvites.length} invitations)`,
        files: [attachment],
      });

      // Supprimer le fichier après 30 secondes
      setTimeout(() => {
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
      }, 30000);
    } catch (error) {
      console.error(error);
      await interaction.editReply({
        content: '❌ Une erreur est survenue lors de l\'export.',
      });
    }
  },
};
