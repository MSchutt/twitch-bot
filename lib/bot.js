'use strict'

const tls = require('tls')
const assert = require('assert')
const EventEmitter = require('events').EventEmitter

const parser = require('./parser')

const TwitchBot = class TwitchBot extends EventEmitter {

  constructor({
    username,
    oauth,
    channel,
    port=443,
    silence=false
  }) {
    super()
    
    try {
      assert(username)
      assert(oauth)
      assert(channel)
    } catch(err) {
      throw new Error('missing required arguments')
    }

    this.username = username
    this.oauth = oauth
    this.channel = channel.toLowerCase()
    if(this.channel.charAt(0) !== '#') this.channel = '#' + this.channel

    this.irc = new tls.TLSSocket()
    this.port = port
    this.silence = silence

    this._connect()
  }

  async _connect() {
    this.irc.connect({
      host: 'irc.chat.twitch.tv',
      port: this.port
    })
    this.irc.setEncoding('utf8')
    this.irc.once('connect', () => {
      this.writeIrcMessage("PASS " + this.oauth)
      this.writeIrcMessage("NICK " + this.username)
      this.writeIrcMessage("JOIN " + this.channel)

      this.writeIrcMessage("CAP REQ :twitch.tv/membership")
      this.writeIrcMessage("CAP REQ :twitch.tv/tags")
      this.writeIrcMessage("CAP REQ :twitch.tv/commands")

      this.emit('join')
      this.listen()
    })
  }

  listen() {
    this.irc.on('data', data => {
      
      if(data.includes('PRIVMSG')) {
        const chatter = parser.formatPRIVMSG(data)
        this.emit('message', chatter)
      }

    })
  }

  writeIrcMessage(text) {
    this.irc.write(text + "\r\n")
  }

}

module.exports = TwitchBot