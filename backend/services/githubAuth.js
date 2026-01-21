const axios = require('axios');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

class GithubAuthService {
  constructor() {
    this.clientId = process.env.GITHUB_CLIENT_ID;
    this.clientSecret = process.env.GITHUB_CLIENT_SECRET;
    this.redirectUri = process.env.GITHUB_REDIRECT_URI || `${process.env.API_URL}/auth/github/callback`;
  }

  getAuthUrl() {
    const base = 'https://github.com/login/oauth/authorize';
    const params = new URLSearchParams({
      client_id: this.clientId,
      scope: 'read:user user:email',
      redirect_uri: this.redirectUri
    });

    return `${base}?${params.toString()}`;
  }

  async getTokens(code) {
    try {
      const tokenResp = await axios.post(
        'https://github.com/login/oauth/access_token',
        {
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code,
          redirect_uri: this.redirectUri
        },
        {
          headers: { Accept: 'application/json' },
          timeout: 10000
        }
      );

      return tokenResp.data; // { access_token, scope, token_type }
    } catch (error) {
      console.error('Error exchanging GitHub code for token:', error.response?.data || error.message);
      throw new Error('Failed to get tokens from GitHub');
    }
  }

  async getUserInfo(accessToken) {
    try {
      const headers = {
        Authorization: `token ${accessToken}`,
        Accept: 'application/vnd.github.v3+json'
      };

      const userResp = await axios.get('https://api.github.com/user', { headers, timeout: 10000 });
      const emailsResp = await axios.get('https://api.github.com/user/emails', { headers, timeout: 10000 });

      const primaryEmailObj = (emailsResp.data || []).find(e => e.primary && e.verified) || emailsResp.data?.[0];

      return {
        id: userResp.data.id,
        login: userResp.data.login,
        name: userResp.data.name || userResp.data.login,
        email: primaryEmailObj ? primaryEmailObj.email : null,
        picture: userResp.data.avatar_url
      };
    } catch (error) {
      console.error('Error getting GitHub user info:', error.response?.data || error.message);
      throw new Error('Failed to get user info from GitHub');
    }
  }

  generateJWT(userId) {
    return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
  }

  async createOrUpdateUser(userInfo, tokens) {
    try {
      let user = await User.findOne({ githubId: userInfo.id });

      if (user) {
        user.email = userInfo.email || user.email;
        user.name = userInfo.name || user.name;
        user.picture = userInfo.picture || user.picture;
        user.githubToken = tokens.access_token || user.githubToken;
        user.isActive = true;
      } else {
        // If user with same email exists, link GitHub account
        if (userInfo.email) {
          user = await User.findOne({ email: userInfo.email });
        }

        if (user) {
          user.githubId = userInfo.id;
          user.githubToken = tokens.access_token;
          user.name = userInfo.name || user.name;
          user.picture = userInfo.picture || user.picture;
          user.isActive = true;
        } else {
          user = new User({
            email: userInfo.email,
            name: userInfo.name,
            githubId: userInfo.id,
            picture: userInfo.picture,
            githubToken: tokens.access_token,
            isActive: true
          });
        }
      }

      await user.save();
      return user;
    } catch (error) {
      console.error('Error creating/updating GitHub user:', error);
      throw new Error('Failed to create or update user');
    }
  }
}

module.exports = new GithubAuthService();
