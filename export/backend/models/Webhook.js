const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const Webhook = sequelize.define('Webhook', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  url: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isUrl: true
    }
  },
  events: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: []
  },
  secret: {
    type: DataTypes.STRING,
    allowNull: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  lastTriggered: {
    type: DataTypes.DATE,
    allowNull: true
  },
  successCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  failureCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'webhooks',
  timestamps: true
});

// Instance methods
Webhook.prototype.trigger = async function(payload) {
  if (!this.isActive) {
    throw new Error('Webhook is not active');
  }

  const crypto = require('crypto');
  const signature = crypto
    .createHmac('sha256', this.secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  try {
    const fetch = require('node-fetch');
    const response = await fetch(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'User-Agent': 'BedagangPOS-Webhook/1.0'
      },
      body: JSON.stringify(payload),
      timeout: 30000 // 30 seconds
    });

    if (response.ok) {
      this.successCount += 1;
      this.lastTriggered = new Date();
      await this.save();
      return { success: true, status: response.status };
    } else {
      this.failureCount += 1;
      await this.save();
      return { success: false, status: response.status, error: await response.text() };
    }
  } catch (error) {
    this.failureCount += 1;
    await this.save();
    throw error;
  }
};

// Class methods
Webhook.triggerEvent = async function(event, payload) {
  const webhooks = await this.findAll({
    where: {
      isActive: true,
      events: { [sequelize.Sequelize.Op.contains]: [event] }
    }
  });

  const results = [];
  for (const webhook of webhooks) {
    try {
      const result = await webhook.trigger({
        event,
        data: payload,
        timestamp: new Date().toISOString(),
        webhookId: webhook.id
      });
      results.push({ webhookId: webhook.id, success: true, result });
    } catch (error) {
      console.error(`Webhook ${webhook.id} failed:`, error);
      results.push({ webhookId: webhook.id, success: false, error: error.message });
    }
  }

  return results;
};

module.exports = Webhook;
