import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrorCodes } from '@zentao/shared';
import { BusinessException } from '../../common/exceptions/business.exception.js';
import { SysDept } from './entities/sys-dept.entity.js';
import { SysUser } from './entities/sys-user.entity.js';
import { CreateDeptDto, UpdateDeptDto } from './dto/dept.dto.js';

export interface DeptNode extends SysDept {
  children: DeptNode[];
}

/** 部门树（docs/04 §2 sys_dept；grade=parent.grade+1、path 物化路径） */
@Injectable()
export class DeptService {
  constructor(
    @InjectRepository(SysDept) private readonly deptRepo: Repository<SysDept>,
    @InjectRepository(SysUser) private readonly userRepo: Repository<SysUser>,
  ) {}

  async create(dto: CreateDeptDto, operatorId: string): Promise<SysDept> {
    const parent = dto.parentId
      ? await this.deptRepo.findOne({
          where: { id: String(dto.parentId), deleted: 0 },
        })
      : null;
    if (dto.parentId && !parent)
      throw new BusinessException(
        ErrorCodes.VALIDATION.NOT_FOUND,
        '父部门不存在',
      );

    const grade = parent ? parent.grade + 1 : 1;
    const created = await this.deptRepo.save(
      this.deptRepo.create({
        name: dto.name,
        parentId: parent ? Number(parent.id) : 0,
        grade,
        manager: dto.manager ?? '',
        sortNo: dto.sortNo ?? 0,
        createdBy: operatorId,
        pathStr: '', // 落库后按 id 回填
      }),
    );
    created.pathStr = parent
      ? `${parent.pathStr}${created.id},`
      : `,${created.id},`;
    return this.deptRepo.save(created);
  }

  /** 全量树（部门量级小；前端懒展开） */
  async tree(): Promise<DeptNode[]> {
    const list = await this.deptRepo.find({
      where: { deleted: 0 },
      order: { sortNo: 'ASC', id: 'ASC' },
    });
    const nodes = new Map<string, DeptNode>(
      list.map((d) => [d.id, { ...d, children: [] }]),
    );
    const roots: DeptNode[] = [];
    for (const node of nodes.values()) {
      const parent = nodes.get(node.parentId.toString());
      parent ? parent.children.push(node) : roots.push(node);
    }
    return roots;
  }

  async update(id: string, dto: UpdateDeptDto): Promise<SysDept> {
    const dept = await this.mustFind(id);
    if (dto.name !== undefined) dept.name = dto.name;
    if (dto.manager !== undefined) dept.manager = dto.manager;
    if (dto.sortNo !== undefined) dept.sortNo = dto.sortNo;
    return this.deptRepo.save(dept);
  }

  /** 删除约束：有子部门或挂有用户则拒绝（docs/03 §4.1 语义，错误码 3007） */
  async remove(id: string): Promise<void> {
    await this.mustFind(id);
    const children = await this.deptRepo.count({
      where: { parentId: Number(id), deleted: 0 },
    });
    if (children > 0) {
      throw new BusinessException(
        ErrorCodes.VALIDATION.BUSINESS_RULE,
        '存在子部门，禁止删除',
      );
    }
    const users = await this.userRepo.count({
      where: { deptId: id, deleted: 0 },
    });
    if (users > 0) {
      throw new BusinessException(
        ErrorCodes.VALIDATION.BUSINESS_RULE,
        '部门下仍有用户，禁止删除',
      );
    }
    await this.deptRepo.update(id, { deleted: 1 });
  }

  private async mustFind(id: string): Promise<SysDept> {
    const dept = await this.deptRepo.findOne({ where: { id, deleted: 0 } });
    if (!dept)
      throw new BusinessException(
        ErrorCodes.VALIDATION.NOT_FOUND,
        '部门不存在',
      );
    return dept;
  }
}
