module.exports = async client => {
    // status
    client.user.setActivity(`${client.config.prefix}help | opensource`, { type: "PLAYING" });
};