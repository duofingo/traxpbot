const axios = require("axios");
const Discord = require("discord.js");

exports.run = async (client, message, args, groupID) => {

  var roles;
  await await axios.get(`https://groups.roblox.com/v1/groups/${groupID}/roles`)
      .then(function (response) {
        roles = response.data.roles;
      })

  var ranksEmbed = new Discord.MessageEmbed()
    .setColor(0x6D3297)
    .setTitle(`Ranks & XP`)
    .setDescription(`Listed below are the **\`${roles.length} Rank-${client.config.experience_name}\`** requirements for each rank`)

  for (x = 0; x < roles.length; x++){
    await axios.get(`${client.config.firebase_url}/guilds/${message.guild.id}/role_xp/${roles[x].rank}.json`)
      .then(function (response) {
        if (response.data !== null){
          if (response.data.xp === -1){
            ranksEmbed.addField(`${roles[x].name}`, `ID: **\`${roles[x].rank}\`**\n${client.config.experience_name}: **:lock:**`, true)
          }else{
            ranksEmbed.addField(`${roles[x].name}`, `ID: **\`${roles[x].rank}\`**\n${client.config.experience_name}: **\`${response.data.xp}\`**`, true)
          }
        }else{
          ranksEmbed.addField(`${roles[x].name}`, `ID: **\`${roles[x].rank}\`**\n${client.config.experience_name}: **[Error](https://www.discord.gg/fHpfmy5)**`, true)
        }
      })
  }


  return message.channel.send(ranksEmbed)



};

exports.info = {
  names: ["ranklist"],
  usage: "ranklist",
  description: "Grabs rank-xp information from the database",
};