const peerOrg = require('./peerOrgs.json');

class PeerOrg {
  constructor() {
    this.peerOrgConfig = peerOrg;
  }

  getPeerOrgConfig() {
    return this.peerOrgConfig;
  }

  find(channelName, peerHostname) {
    for(let val of this.getPeerOrgConfig()) {
      const peerDomain = 'peer0.' + val.Domain;
      if (peerDomain === peerHostname && channelName === val.ChannelName && val.BindingName !== '') {
        return true;
      }
    }

    return false;
  }

  findPeerStatus(peerHostname) {
    for(let val of this.getPeerOrgConfig()) {
      const peerDomain = 'peer0.' + val.Domain;
      if (peerDomain === peerHostname && val.BindingName !== '') {
        return true;
      }
    }

    return false;
  }
}
module.exports = new PeerOrg();
