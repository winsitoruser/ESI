import crypto from 'crypto';
import logger from '@/lib/logger';

const SERVICE_NAME = 'webhook-service';

export interface WebhookPayload {
  event: string;
  data: any;
  timestamp: string;
  tenantId: string;
  branchId?: string;
  signature?: string;
}

export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  event: string;
  secretKey?: string;
  headers?: Record<string, string>;
  timeout: number;
  retryCount: number;
}

export class WebhookService {
  private static instance: WebhookService;

  private constructor() {}

  public static getInstance(): WebhookService {
    if (!WebhookService.instance) {
      WebhookService.instance = new WebhookService();
    }
    return WebhookService.instance;
  }

  /**
   * Trigger webhooks for specific event
   */
  public async triggerWebhooks(
    event: string,
    data: any,
    tenantId: string,
    branchId?: string,
    triggeredBy?: string
  ): Promise<void> {
    try {
      // Get active webhooks for this event
      const webhooks = await this.getWebhooksForEvent(event, tenantId, branchId);

      if (webhooks.length === 0) {
        logger.debug(`[${SERVICE_NAME}] No webhooks configured for event: ${event}`);
        return;
      }

      // Create payload
      const payload: WebhookPayload = {
        event,
        data,
        timestamp: new Date().toISOString(),
        tenantId,
        branchId
      };

      // Trigger each webhook
      const promises = webhooks.map(webhook => 
        this.sendWebhook(webhook, payload, triggeredBy)
      );

      await Promise.allSettled(promises);
      logger.info(`[${SERVICE_NAME}] Triggered ${webhooks.length} webhooks for event: ${event}`);

    } catch (error) {
      logger.error(`[${SERVICE_NAME}] Error triggering webhooks:`, error);
    }
  }

  /**
   * Send webhook to specific URL
   */
  private async sendWebhook(
    webhook: WebhookConfig,
    payload: WebhookPayload,
    triggeredBy?: string,
    attempt: number = 1
  ): Promise<void> {
    const { sequelize } = await import('@/lib/sequelizeClient');
    const { QueryTypes } = require('sequelize');

    try {
      // Add signature if secret key exists
      if (webhook.secretKey) {
        payload.signature = this.generateSignature(payload, webhook.secretKey);
      }

      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'Bedagang-POS-Webhook/1.0',
        'X-Webhook-Event': payload.event,
        'X-Webhook-Tenant': payload.tenantId,
        ...webhook.headers
      };

      if (payload.branchId) {
        headers['X-Webhook-Branch'] = payload.branchId;
      }

      // Create log entry
      const [log] = await sequelize.query(`
        INSERT INTO webhook_logs (
          id, webhook_id, event, payload, attempt, status,
          triggered_by, tenant_id, created_at, updated_at
        ) VALUES (
          UUID(), :webhookId, :event, :payload, :attempt, 'pending',
          :triggeredBy, :tenantId, NOW(), NOW()
        )
        RETURNING *
      `, {
        replacements: {
          webhookId: webhook.id,
          event: payload.event,
          payload: JSON.stringify(payload),
          attempt,
          triggeredBy,
          tenantId: payload.tenantId
        },
        type: QueryTypes.SELECT
      });

      const startTime = Date.now();

      // Send webhook
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(webhook.timeout)
      });

      const duration = Date.now() - startTime;
      const responseText = await response.text();

      // Update log with response
      await sequelize.query(`
        UPDATE webhook_logs SET
          response_status = :responseStatus,
          response_body = :responseBody,
          response_headers = :responseHeaders,
          duration = :duration,
          status = :status,
          updated_at = NOW()
        WHERE id = :logId
      `, {
        replacements: {
          logId: log.id,
          responseStatus: response.status,
          responseBody: responseText.substring(0, 1000), // Limit response body
          responseHeaders: JSON.stringify(Object.fromEntries(response.headers.entries())),
          duration,
          status: response.ok ? 'success' : 'failed'
        }
      });

      if (!response.ok) {
        throw new Error(`Webhook failed with status ${response.status}: ${responseText}`);
      }

      logger.debug(`[${SERVICE_NAME}] Webhook sent successfully`, {
        webhookId: webhook.id,
        event: payload.event,
        status: response.status,
        duration
      });

    } catch (error: any) {
      logger.error(`[${SERVICE_NAME}] Webhook delivery failed`, {
        webhookId: webhook.id,
        event: payload.event,
        attempt,
        error: error.message
      });

      // Check if we should retry
      if (attempt < webhook.retryCount) {
        const nextRetryAt = new Date(Date.now() + Math.pow(2, attempt) * 1000); // Exponential backoff
        
        await sequelize.query(`
          UPDATE webhook_logs SET
            status = 'retrying',
            error_message = :errorMessage,
            next_retry_at = :nextRetryAt,
            updated_at = NOW()
          WHERE webhook_id = :webhookId
          AND event = :event
          AND created_at = (
            SELECT MAX(created_at) FROM webhook_logs 
            WHERE webhook_id = :webhookId AND event = :event
          )
        `, {
          replacements: {
            webhookId: webhook.id,
            event: payload.event,
            errorMessage: error.message,
            nextRetryAt
          }
        });

        // Schedule retry
        setTimeout(() => {
          this.sendWebhook(webhook, payload, triggeredBy, attempt + 1);
        }, Math.pow(2, attempt) * 1000);
      } else {
        // Mark as failed after max retries
        await sequelize.query(`
          UPDATE webhook_logs SET
            status = 'failed',
            error_message = :errorMessage,
            updated_at = NOW()
          WHERE webhook_id = :webhookId
          AND event = :event
          AND created_at = (
            SELECT MAX(created_at) FROM webhook_logs 
            WHERE webhook_id = :webhookId AND event = :event
          )
        `, {
          replacements: {
            webhookId: webhook.id,
            event: payload.event,
            errorMessage: error.message
          }
        });
      }
    }
  }

  /**
   * Get webhooks configured for specific event
   */
  private async getWebhooksForEvent(
    event: string,
    tenantId: string,
    branchId?: string
  ): Promise<WebhookConfig[]> {
    const { sequelize } = await import('@/lib/sequelizeClient');
    const { QueryTypes } = require('sequelize');

    const webhooks = await sequelize.query(`
      SELECT 
        id, name, url, event, secret_key, headers, timeout, retry_count
      FROM webhooks
      WHERE event = :event
      AND tenant_id = :tenantId
      AND is_active = true
      AND (branch_id = :branchId OR branch_id IS NULL)
      ORDER BY branch_id DESC NULLS LAST
    `, {
      replacements: { event, tenantId, branchId },
      type: QueryTypes.SELECT
    });

    return webhooks.map((w: any) => ({
      id: w.id,
      name: w.name,
      url: w.url,
      event: w.event,
      secretKey: w.secret_key,
      headers: w.headers,
      timeout: w.timeout,
      retryCount: w.retry_count
    }));
  }

  /**
   * Generate HMAC signature for webhook payload
   */
  private generateSignature(payload: WebhookPayload, secret: string): string {
    const payloadString = JSON.stringify(payload);
    return crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');
  }

  /**
   * Verify webhook signature
   */
  public static verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  /**
   * Process failed webhooks (retry queue)
   */
  public async processRetryQueue(): Promise<void> {
    const { sequelize } = await import('@/lib/sequelizeClient');
    const { QueryTypes } = require('sequelize');

    try {
      // Get webhooks that need retry
      const failedWebhooks = await sequelize.query(`
        SELECT 
          wl.*,
          w.url, w.secret_key, w.headers, w.timeout, w.retry_count
        FROM webhook_logs wl
        JOIN webhooks w ON wl.webhook_id = w.id
        WHERE wl.status = 'retrying'
        AND wl.next_retry_at <= NOW()
        ORDER BY wl.next_retry_at ASC
        LIMIT 10
      `, {
        type: QueryTypes.SELECT
      });

      for (const failed of failedWebhooks) {
        const webhook: WebhookConfig = {
          id: failed.webhook_id,
          name: failed.name,
          url: failed.url,
          event: failed.event,
          secretKey: failed.secret_key,
          headers: failed.headers,
          timeout: failed.timeout,
          retryCount: failed.retry_count
        };

        const payload = JSON.parse(failed.payload);
        
        await this.sendWebhook(
          webhook,
          payload,
          failed.triggered_by,
          failed.attempt + 1
        );
      }

      if (failedWebhooks.length > 0) {
        logger.info(`[${SERVICE_NAME}] Processed ${failedWebhooks.length} webhook retries`);
      }

    } catch (error) {
      logger.error(`[${SERVICE_NAME}] Error processing webhook retry queue:`, error);
    }
  }
}

// Export singleton instance
export const webhookService = WebhookService.getInstance();

// Schedule retry queue processing every minute
if (typeof window === 'undefined') {
  setInterval(() => {
    webhookService.processRetryQueue();
  }, 60000);
}
