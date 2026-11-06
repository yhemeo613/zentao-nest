import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ErrorCodes } from '@zentao/shared';
import { BusinessException } from '../../common/exceptions/business.exception.js';
import { ZtWebhook, ZtWebhookLog } from './entities/webhook.entities.js';

export interface CreateWebhookDto {
  type: string;
  name: string;
  url: string;
  secret?: string;
  actions?: string[];
}

const WEBHOOK_TYPES = [
  'dinggroup',
  'dinguser',
  'wechatgroup',
  'wechatuser',
  'feishugroup',
  'feishuuser',
  'default',
];

/** Webhook 管理（docs/03 §4.24；一期配置+日志，投递执行随 P7 通道） */
@Injectable()
export class WebhookService {
  constructor(
    @InjectRepository(ZtWebhook)
    private readonly webhookRepo: Repository<ZtWebhook>,
    @InjectRepository(ZtWebhookLog)
    private readonly logRepo: Repository<ZtWebhookLog>,
  ) {}

  async create(dto: CreateWebhookDto, operatorId: string): Promise<ZtWebhook> {
    if (!WEBHOOK_TYPES.includes(dto.type)) {
      throw new BusinessException(
        ErrorCodes.WEBHOOK_CONFIG.URL_INVALID,
        'webhook 类型非法',
      );
    }
    if (!dto.url.startsWith('https://')) {
      throw new BusinessException(
        ErrorCodes.WEBHOOK_CONFIG.URL_INVALID,
        'URL 须为 https',
      );
    }
    void operatorId;
    return this.webhookRepo.save(
      this.webhookRepo.create({
        type: dto.type,
        name: dto.name,
        url: dto.url,
        secret: dto.secret ?? '',
        actions: dto.actions ?? null,
      }),
    );
  }

  async list(): Promise<ZtWebhook[]> {
    return this.webhookRepo.find({
      where: { deleted: 0 },
      order: { id: 'ASC' },
    });
  }

  async update(id: string, dto: Partial<CreateWebhookDto>): Promise<ZtWebhook> {
    const hook = await this.mustFind(id);
    if (dto.name !== undefined) hook.name = dto.name;
    if (dto.url !== undefined) {
      if (!dto.url.startsWith('https://'))
        throw new BusinessException(ErrorCodes.WEBHOOK_CONFIG.URL_INVALID);
      hook.url = dto.url;
    }
    if (dto.secret !== undefined) hook.secret = dto.secret;
    if (dto.actions !== undefined) hook.actions = dto.actions;
    return this.webhookRepo.save(hook);
  }

  async remove(id: string): Promise<void> {
    await this.mustFind(id);
    await this.webhookRepo.update(id, { deleted: 1 });
  }

  /** 投递日志（P7 投递器落地后产生；当前可空） */
  async logs(id: string): Promise<ZtWebhookLog[]> {
    await this.mustFind(id);
    return this.logRepo.find({
      where: { webhookId: id },
      order: { id: 'DESC' },
      take: 100,
    });
  }

  /** 订阅动作矩阵校验（5502）：动作须在已知对象动作内（简查包含点号） */
  validateActions(actions: string[]): void {
    for (const a of actions) {
      if (!a.includes('.') || a.length < 5) {
        throw new BusinessException(
          ErrorCodes.WEBHOOK_CONFIG.ACTION_NOT_SUBSCRIBED,
          `非法订阅动作：${a}`,
        );
      }
    }
  }

  /** 按 action 查订阅 webhook（notify 派发用，P7 接线） */
  async findByAction(objectType: string, action: string): Promise<ZtWebhook[]> {
    const all = await this.webhookRepo.find({ where: { deleted: 0 } });
    const key = `${objectType}.${action}`;
    return all.filter(
      (h) =>
        !h.actions ||
        h.actions.includes(key) ||
        h.actions.includes(`${objectType}.*`),
    );
  }

  private async mustFind(id: string): Promise<ZtWebhook> {
    const hook = await this.webhookRepo.findOne({ where: { id, deleted: 0 } });
    if (!hook)
      throw new BusinessException(
        ErrorCodes.VALIDATION.NOT_FOUND,
        'webhook 不存在',
      );
    return hook;
  }
}

void In;
