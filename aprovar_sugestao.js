// commands/aprovar_sugestao.js
import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";
import { getSuggestionByProtocol, approveSuggestion } from "../../database/sugestoesDB.js";

export default {
  data: new SlashCommandBuilder()
    .setName("aprovar_sugestao")
    .setDescription("Aprova uma sugestão pelo protocolo")
    .addStringOption(option =>
      option.setName("protocolo")
        .setDescription("Protocolo da sugestão a aprovar")
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName("nota")
        .setDescription("Observação opcional sobre a aprovação")
        .setRequired(false)
    ),

  async execute(interaction) {
    const protocolo = interaction.options.getString("protocolo");
    const nota = interaction.options.getString("nota") || null;

    try {
      const sugestao = await getSuggestionByProtocol(protocolo);
      if (!sugestao) return await interaction.reply({
        content: "❌ Sugestão não encontrada!",
        flags: MessageFlags.Ephemeral
      });

      if (sugestao.status === "aprovada")
        return await interaction.reply({
          content: "⚠️ Esta sugestão já foi aprovada!",
          flags: MessageFlags.Ephemeral
        });

      // atualiza no DB
      await approveSuggestion(protocolo, interaction.user.id, nota);

      // atualiza embed no canal
      const canal = await interaction.guild.channels.fetch(sugestao.channelId);
      const mensagem = await canal.messages.fetch(sugestao.messageId);

      const embed = EmbedBuilder.from(mensagem.embeds[0])
        .setFields(
          { name: "📊 Status", value: "🟢 Sugestão aprovada ✅", inline: false },
          { name: "📝 Nota da equipe", value: nota || "Sem observações", inline: false }
        )
        .setColor("#00FF00")
        .setFooter({ text: `Aprovada por ${interaction.user.tag}` });

      await mensagem.edit({ embeds: [embed] });

      // notifica o autor
      await interaction.guild.members.fetch(sugestao.authorId)
        .then(member => {
          member.send({
            content: `💡 Sua sugestão \`${protocolo}\` foi aprovada pela equipe! 🎉\nNota: ${nota || "Sem observações"}`
          }).catch(() => null);
        });

      await interaction.reply({
        content: `✅ Sugestão \`${protocolo}\` aprovada com sucesso!`,
        flags: MessageFlags.Ephemeral
      });

    } catch (err) {
      console.error("❌ Erro ao aprovar sugestão:", err);
      await interaction.reply({
        content: "⚠️ Ocorreu um erro ao aprovar a sugestão.",
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
