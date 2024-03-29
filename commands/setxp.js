const axios = require('axios');
const Discord = require("discord.js");
const admin = require("firebase-admin");
const rblxFunctions = require("noblox.js");


exports.run = async (client, message, args, groupID) => {

	var db = admin.database();

	// command can only be ran in guild text channels
	if (message.channel.type === "dm") return message.channel.send(`That command can't be used through direct messages!`)

	// only your highest approved users at an elevated rank can run this (high_command_role
	if (!message.member.roles.cache.some(role => role.name === `${client.config.high_command_role}`)) {
		return message.channel.send(`Sorry ${message.author}, but only users with the **${client.config.high_command_role}** role can run that command!`);
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
			.setDescription(`You must specify a number (0-∞) for me to add ${client.config.experience_name} points to the specified users\n\n**${client.config.prefix}set # username1, username2, etc**`)
		return message.reply(badEmbed).then(message => message.delete({timeout: 5000, reason: "delete"}));
	};

	// if no usernames present, error!
	if (!args[2]){
		var badEmbed = new Discord.MessageEmbed()
			.setColor(0xf54242)
			.setDescription(`Please provide the ROBLOX username that you want to add ${client.config.experience_name} to\n\n**${client.config.prefix}set # username1, username2, etc**`)
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
		.setDescription(`Working on updating ${userArray.length} user(s)...`)
    .setThumbnail(`https://upload.wikimedia.org/wikipedia/commons/a/a0/Cartoon_steamer_duck_walking_animation.gif`)

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

		// error message
		if (flag){
			var badEmbed = new Discord.MessageEmbed()
				.setColor(0xf54242)
				.setDescription(`User **${rblx_username}** doesn't exist!`)
			message.channel.send(badEmbed);
			continue;
		};
	
		// get total points so far from profile
		var current_points;

		await axios.get(`${client.config.firebase_url}/guilds/${message.guild.id}/users/${rblx_id}.json`)
			.then(function (response) {
				if (response.data == null){
					current_points = 0;
					flag = true;
				}else{
					current_points = Number(response.data.xp);
				}
			})

		// new total points added together
		var new_total_points = setPoints;
	
		if (flag){
			db.ref(`guilds/${message.guild.id}/users/${rblx_id}`).set({
			  xp: Number(new_total_points)
			});

			// embed message to channel
			var doneEmbed = new Discord.MessageEmbed()
				.setColor(0x6D3297)
				.setDescription(`Created ${rblx_username}'s profile`)
			await message.channel.send(doneEmbed)

		}else{
			db.ref(`guilds/${message.guild.id}/users/${rblx_id}`).set({
			  xp: Number(new_total_points)
			});

			// embed message to channel
			var doneEmbed = new Discord.MessageEmbed()
				.setColor(0x28F6FF)
				.setDescription(`Updated ${rblx_username}'s profile`)
			await message.channel.send(doneEmbed)
			
		}

		var flag = true;

		// promotions
		while (flag){
			// user's current roleset id
			var current_rolesetID;

			// fetch data
			await axios.get(`https://groups.roblox.com/v2/users/${rblx_id}/groups/roles`)
				.then(function (response) {
					var flag = false;
					for (new_i = 0; new_i < response.data.data.length; new_i++) {
						if (response.data.data[new_i].Id == groupID) {
							flag = true;
							current_rolesetID = response.data.data[new_i].rank;
							break;
						}
					}

					if (flag == false) {
						current_rolesetID = 0;
					}
				});


			// next roleset id
			var next_rolesetID = 0;
			var next_rolesetName;

			for (not_i = 0; not_i < roles.length; not_i++) {
				if (roles[not_i].ranj == current_rolesetID && current_rolesetID !== 255) {
					next_rolesetID = roles[not_i + 1].rank;
					next_rolesetName = roles[not_i + 1].name;
					break;
				} else if (current_rolesetID == 255) {
					next_rolesetID = -2;
					break;
				}
			}

			if (next_rolesetID >= 1) {
				var nextRank_xp;

				// user is not owner or guest
				await axios.get(`${client.config.firebase_url}/guilds/${message.guild.id}/role_xp/${next_rolesetID}.json`)
					.then(function (response) {
						nextRank_xp = response.data.xp
					});

				if (nextRank_xp !== -1) {
					if (new_total_points >= nextRank_xp) {
						await rblxFunctions.setRank({ group: groupID, target: rblx_id, rank: next_rolesetID });
						var promotionEmbed = new Discord.MessageEmbed()
							.setColor(0x21ff7a)
							.setImage("https://media.giphy.com/media/ehhuGD0nByYxO/giphy.gif")
							.setDescription(`**:confetti_ball: \`${rblx_username}\` has been promoted to \`${next_rolesetName}\`! :confetti_ball:**`)

					}else{
						flag = false;
					}
				}else{
					flag = false;
				}
			}else{
				flag = false;
			}
		}

		flag = true;

		// demotions
		while (flag) {
			// user's current roleset id
			var current_rolesetID;

			// fetch data
		await axios.get(`https://groups.roblox.com/v2/users/${rblx_id}/groups/roles`)
				.then(function (response) {
					var flag = false;
					for (new_i = 0; new_i < response.data.data.length; new_i++) {
						if (response.data.data[new_i].group.id == groupID) {
							flag = true;
							current_rolesetID = response.data.data[new_i].role.rank;
							break;
						}
					}

					if (flag == false) {
						current_rolesetID = 0;
					}
				});


			// next roleset id
			var previous_rolesetID = 0;
			var previous_rolesetName;

			for (not_i = 0; not_i < roles.length; not_i++) {
				if (roles[not_i].Rank == current_rolesetID && current_rolesetID !== 255) {
					previous_rolesetID = roles[not_i - 1].Rank;
					previous_rolesetName = roles[not_i - 1].Name;
					console.log(previous_rolesetName);
					break;
				} else if (current_rolesetID == 255) {
					previous_rolesetID = -2;
					break;
				}
			}

			if (previous_rolesetID >= 1) {
				var previousRank_xp;

				// user is not owner or guest
				await axios.get(`${client.config.firebase_url}/guilds/${message.guild.id}/role_xp/${previous_rolesetID}.json`)
					.then(function (response) {
						previousRank_xp = response.data.xp
					});

				if (previousRank_xp !== -1) {
					if (new_total_points <= previousRank_xp) {
						await rblxFunctions.setRank({ group: groupID, target: rblx_id, rank: previous_rolesetID });
						var promotionEmbed = new Discord.MessageEmbed()
							.setColor(0xf54242)
							.setImage("https://media.giphy.com/media/qQdL532ZANbjy/giphy.gif")
							.setDescription(`**:confetti_ball: \`${rblx_username}\` has been demoted to \`${previous_rolesetName}\`! :confetti_ball:**`)

					} else {
						flag = false;
					}
				} else {
					flag = false;
				}
			} else {
				flag = false;
			}
		}

	}

	return message.channel.send(`Updated everyone's profile!`).then(message => message.delete({timeout: 5000, reason: "delete"}));
};

exports.info = {
    names: ["set"],
    usage: 'set <#> <rblx_username>',
    description: "Set xp to user's profile"
};