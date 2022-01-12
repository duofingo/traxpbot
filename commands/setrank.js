const axios = require('axios');
const Discord = require("discord.js");
const admin = require("firebase-admin");
const rblxFunctions = require("noblox.js");


exports.run = async (client, message, args, groupID) => {

	var db = admin.database();

	// command can only be ran in guild text channels
	if (message.channel.type === "dm") return message.channel.send(`That command can't be used through direct messages!`)

	// only your highest approved users at an elevated rank can run this (high_command_role
	if (!message.member.roles.cache.some(role => role.name === `${client.config.officer_role}`)) {
		return message.channel.send(`Sorry ${message.author}, but only users with the **${client.config.officer_role}** role can run that command!`);
	};
	
	// officer id
	var officer_rblx_id;
	
	// boolean for user id fetcher checker
	var flag = true;

	// make sure officer is verified with us!
	await axios.get(`${client.config.firebase_url}/verified_users/${message.author.id}.json`)
		.then(function (response) {
			// if null - user isn't verified
			if (response.data == null){
				flag = false;
			}else{
				// user is verified, get id
				officer_rblx_id = response.data.rblx_id
			}
		}).catch(function (error) {
			// error, shouldn't happen tbh
			console.log(`Error - ${error} (set.js)`)
		})

	// user isn't verified
	if (flag == false){
		var badEmbed = new Discord.MessageEmbed()
			.setColor(0xf54242)
			.setDescription(`You must verify yourself before you can run the **set** command!`)
		return message.reply(badEmbed).then(message => message.delete({timeout: 5000, reason: "delete"}));
	}
	
	// make sure number is a number and is between the specified numberss
	if (!args[1] || isNaN(Number(args[1])) || Number(args[1]) < 0){
		var badEmbed = new Discord.MessageEmbed()
			.setColor(0xf54242)
			.setDescription(`You must specify a number (0-254) for me to set a player's rank to the specified rank\n\n**${client.config.prefix}setrank # username1, username2, etc**`)
		return message.reply(badEmbed).then(message => message.delete({timeout: 5000, reason: "delete"}));
	};

	// if no usernames present, error!
	if (!args[2]){
		var badEmbed = new Discord.MessageEmbed()
			.setColor(0xf54242)
			.setDescription(`Please provide the ROBLOX username that you want to set their rank to.\n\n**${client.config.prefix}setrank # username1, username2, etc**`)
		return message.reply(badEmbed).then(message => message.delete({timeout: 5000, reason: "delete"}));
	};

	// collect usernames into an array
	var userArray = message.content.slice(message.content.indexOf(message.content.split(" ")[2])).split(',');
	
	// remove duplicates
	userArray = Array.from(new Set(userArray));

	// number variable
	var setPoints = Number(args[1]);

	// tell user that we're still working on command..
	var workinEmbed = new Discord.MessageEmbed()
		.setImage("https://media.tenor.com/images/334cf1e2aa89a90a274f5a4040d1a6ec/tenor.gif")
		.setDescription(`Working on updating ${userArray.length} user(s)...`)

	await message.channel.send(workinEmbed).then(message => message.delete({ timeout: 4000, reason: "delete workin message" }));


	// all roles
	var roles;
      await axios.get(`https://groups.roblox.com/v1/groups/${groupID}/roles`)
      .then(function (response) {
        roles = response.data.roles;
      })
	// for loop to go through array
	for (i = 0; i < userArray.length; i++){
		// username & id & boolean to get out
		var rblx_username = userArray[i].trim();
		var rblx_id;
		var flag = false;
			// grab id if possible
		await axios.get(`https://api.roblox.com/users/get-by-username?username=${rblx_username}`)
			.then(function (response) {
				// wow user doesn't exist
				if (response.data.success == false){
					flag = true;
				}else{
					// user does exist
					rblx_username = response.data.Username;
					rblx_id = response.data.Id;
				}
			})

    // rolename
    var rank_name;

      for (new_i = 0; new_i < roles.length; new_i++){
         if (roles[new_i].rank == args[1]) {
          rank_name = roles[new_i].name;
          break;
         }
      };
    
    var rankBadEmbed = new Discord.MessageEmbed()
							.setColor(0xf54242)
							.setDescription(`You cannot rank \`${rblx_username}\` to the same rank as their current one!`)

    // check if trying to rank to the same current rank
    await axios.get(`https://groups.roblox.com/v2/users/${rblx_id}/groups/roles`)
				.then(function (response) {
					var flag = false;
					for (new_i = 0; new_i < response.data.data.length; new_i++) {
						if (response.data.data[new_i].group.id == groupID) {
              if (response.data.data[new_i].role.rank == args[1]) {
                flag = true
                return message.channel.send(rankBadEmbed)
                break;
              }
						}
					}

					if (flag == false) {
						current_rolesetID = 0;
					}
				});

		// error message
		if (flag){
			var badEmbed = new Discord.MessageEmbed()
				.setColor(0xf54242)
				.setDescription(`User **${rblx_username}** doesn't exist!`)
			message.channel.send(badEmbed);
			continue;
		};
				await rblxFunctions.setRank({ group: groupID, target: rblx_id, rank: Number(args[1]) });
					var promotionEmbed = new Discord.MessageEmbed()
						.setColor(0x21ff7a)
						.setThumbnail("https://media.giphy.com/media/ehhuGD0nByYxO/giphy.gif")
						.setDescription(`:warning: | **\`${rblx_username}\`'s rank has been set to \`${rank_name}\`! **`)


       message.channel.send(promotionEmbed);
      }

	return message.channel.send(`Updated everyone's profile!`).then(message => message.delete({timeout: 5000, reason: "delete"}));
};

exports.info = {
    names: ["setrank"],
    usage: 'setrank <role_id> <rblx_username>',
    description: "Set user to a specified rank."
};