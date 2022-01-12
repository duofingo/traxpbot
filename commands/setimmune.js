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

	// if no usernames present, error!
	if (!args[1]){
		var badEmbed = new Discord.MessageEmbed()
			.setColor(0xf54242)
			.setDescription(`Please provide the ROBLOX username that you want to set their rank to.\n\n**${client.config.prefix}setimmune username1, username2, etc**`)
		return message.reply(badEmbed).then(message => message.delete({timeout: 5000, reason: "delete"}));
	};

	// collect usernames into an array
	var userArray = message.content.slice(message.content.indexOf(message.content.split(" ")[1])).split(',');
	
	// remove duplicates
	userArray = Array.from(new Set(userArray));

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
    var rankBadEmbed = new Discord.MessageEmbed()
			.setColor(0xf54242)
			.setDescription(`\`${rblx_username}\` is already an Immune!`)
    var notInGroupEmbed = new Discord.MessageEmbed()
			.setColor(0xf54242)
			.setDescription(`\`${rblx_username}\` is not in group!`)
    
    var dbFlag = true;

    // check if trying to rank to the same current rank
    await axios.get(`https://groups.roblox.com/v2/users/${rblx_id}/groups/roles`)
			.then(function (response) {
				for (new_i = 0; new_i < response.data.data.length; new_i++) {
					if (response.data.data[new_i].group.id == groupID) {
              if (response.data.data[new_i].role.rank == client.config.immune_rank) {
                dbFlag = false
                return message.channel.send(rankBadEmbed)
                break
               }
          }
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

    // blacklist, remove, and rank user

    var rankBeforeImmune;
    var oldXP_Value;

    await axios.get(`https://groups.roblox.com/v2/users/${rblx_id}/groups/roles`)
				.then(function (response) {
					for (old_i = 0; old_i < response.data.data.length; old_i++) {
						if (response.data.data[old_i].group.id == groupID) {
                rankBeforeImmune = response.data.data[old_i].role.rank;
              }
					}
		});
    
    if (dbFlag == true) {

      await axios.get(`${client.config.firebase_url}/guilds/${message.guild.id}/users/${rblx_id}.json`).then(function (response) {
          if (response.data){
          oldXP_Value = response.data.xp;
          }
       });

      db.ref(`guilds/${message.guild.id}/users/${rblx_id}`).set({
			  oldXp: Number(oldXP_Value),
        currentRank: rankBeforeImmune,
        xp: 0
			});
            
      db.ref(`guilds/${message.guild.id}/blacklist/${rblx_id}`).set({
				description: "Flare Immune"
			});

      var promotionEmbed = new Discord.MessageEmbed()
					.setColor(0x6d3297)
					.setImage("https://media.giphy.com/media/ehhuGD0nByYxO/giphy.gif")
					.setDescription(`:confetti_ball: **\`${rblx_username}\` has been declared __Immune__ to the Flare Virus! :confetti_ball:**`)
			
			await rblxFunctions.setRank({ group: groupID, target: rblx_id, rank: Number(client.config.immune_rank)});
      message.channel.send(promotionEmbed);

  }}

	return message.channel.send(`Updated everyone's profile!`).then(message => message.delete({timeout: 5000, reason: "delete"}),dbFlag = false,oldXP_DB = true);
};

exports.info = {
    names: ["setimmune"],
    usage: 'setimmune <rblx_username>',
    description: "Declare user as Immune to Flare."
};