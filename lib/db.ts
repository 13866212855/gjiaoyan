import { Pool } from 'pg';

const DEFAULT_NEON_URL =
  'postgresql://neondb_owner:npg_VFNL7wl3HXie@ep-proud-tooth-ay7ylxhx-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require';

const connectionString = process.env.DATABASE_URL || DEFAULT_NEON_URL;

let pool: Pool;

declare global {
  var __pgPool: Pool | undefined;
}

if (process.env.NODE_ENV === 'production') {
  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
} else {
  if (!global.__pgPool) {
    global.__pgPool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  pool = global.__pgPool;
}

export { pool };

export interface Member {
  id: number;
  name: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface Activity {
  id: number;
  title: string;
  instructor_id: number;
  activity_date: string;
  ai_teaching_plan?: string | null;
  created_at: string;
  instructor_name?: string;
  listeners?: Member[];
  uploads?: UploadItem[];
  listening_notes_template?: string | null;
}

export interface UploadItem {
  id: number;
  activity_id: number;
  member_id: number | null;
  file_type: 'activity_photo' | 'attendance_sheet' | 'summary_image' | 'listening_note' | 'lesson_plan' | 'ppt';
  file_name: string;
  file_path: string;
  uploaded_at: string;
  member_name?: string;
}

export interface LlmConfig {
  id: number;
  name: string;
  base_url: string;
  api_key: string;
  model_name: string;
  is_active: number;
  created_at: string;
}

export interface AppSetting {
  id: number;
  setting_key: string;
  setting_value: string;
  updated_at: string;
}

let initPromise: Promise<void> | null = null;

// 确保核心表存在并植入默认初始教研组数据
export async function initDb() {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS members (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            status VARCHAR(20) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS activities (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            instructor_id INTEGER REFERENCES members(id),
            activity_date DATE NOT NULL,
            ai_teaching_plan TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS uploads (
            id SERIAL PRIMARY KEY,
            activity_id INTEGER REFERENCES activities(id) ON DELETE CASCADE,
            member_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
            file_type VARCHAR(50) NOT NULL,
            file_name VARCHAR(255) NOT NULL,
            file_path VARCHAR(500) NOT NULL,
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS activity_listeners (
            id SERIAL PRIMARY KEY,
            activity_id INTEGER REFERENCES activities(id) ON DELETE CASCADE,
            member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS listening_notes_templates (
            id SERIAL PRIMARY KEY,
            activity_id INTEGER REFERENCES activities(id) ON DELETE CASCADE,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS llm_config (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            base_url VARCHAR(255) NOT NULL,
            api_key VARCHAR(255) NOT NULL,
            model_name VARCHAR(100) NOT NULL,
            is_active SMALLINT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS app_settings (
            id SERIAL PRIMARY KEY,
            setting_key VARCHAR(100) UNIQUE NOT NULL,
            setting_value VARCHAR(500) NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // 检查并初始化默认成员
        const memberCheck = await pool.query('SELECT COUNT(*) as count FROM members');
        if (Number(memberCheck.rows[0]?.count || 0) === 0) {
          const defaultNames = ['吴思刚', '白金', '王中旭', '刘家阳', '姚闯', '刘俊杰'];
          const memberIds: { id: number; name: string }[] = [];
          for (const name of defaultNames) {
            const res = await pool.query(
              'INSERT INTO members (name, status, created_at) VALUES ($1, $2, CURRENT_TIMESTAMP) RETURNING id, name',
              [name, 'active']
            );
            memberIds.push({ id: res.rows[0].id, name });
          }

          // 初始化默认教研活动 (第1期)
          const instructor = memberIds.find((m) => m.name === '刘俊杰') || memberIds[memberIds.length - 1];
          const listeners = memberIds.filter((m) => m.id !== instructor.id);

          const defaultPlan = `# 《Excel应用--合唱评分技巧计算》教学设计

## 一、教学目标

### （一）知识与技能
1. 理解合唱评分等竞赛场景中“去掉最高分、去掉最低分”的统计规则。
2. 掌握Excel中MAX、MIN、SUM、AVERAGE等核心函数的综合嵌套使用。
3. 能够利用COUNT函数进行评委人数动态校验，设计具备容错性的评分计算表。

### （二）过程与方法
1. 通过真实校园合唱比赛评分统计任务驱动，经历发现问题、分析算法、设计公式、上机验证的完整数字化学习过程。
2. 体验利用电子表格自动化处理复杂数据运算的高效性与严谨性。

### （三）情感态度与价值观
1. 培养科学客观的数据意识与严谨求实的学风。
2. 提升将信息技术知识应用于解决校园生活实际问题的兴趣与数字化创新能力。

## 二、教学重难点
- **教学重点**：结合比赛规则，正确构建“（总分 - 最大值 - 最小值）÷（评委数 - 2）”的计算公式。
- **教学难点**：多函数嵌套的逻辑结构分析，以及在评分表中处理异常缺失值与评委权重的边界情况。

## 三、教学准备
- 耿棚中学信息技术网络机房（已预装Excel环境）
- 校园合唱比赛原始评分数据样表及练习课件素材
- 电子白板教学交互系统与教学广播控制软件

## 四、教学过程
1. **情境导入（5分钟）**：展示我校近期合唱艺术节现场评分片段，引出人工核算耗时易错的痛点，激发学生自主探究利用Excel计算最终得分的动机。
2. **算法探究（10分钟）**：师生共同推导评分计算公式：(SUM - MAX - MIN) / (COUNT - 2)，引导学生理解去除极端分对公平性的保障机制。
3. **任务实践（15分钟）**：学生上机实操，在教师下发的评分表中输入公式并拖拽填充柄，完成所有班级最终得分的自动生成。
4. **展评总结（10分钟）**：广播展示优秀学生作品，针对括号优先级与绝对/相对引用的常见误区进行辨析点拨。`;

          const actRes = await pool.query(
            `INSERT INTO activities (title, instructor_id, activity_date, ai_teaching_plan, created_at)
             VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) RETURNING id`,
            ['Excel应用--合唱评分技巧计算', instructor.id, '2026-09-08', defaultPlan]
          );
          const actId = actRes.rows[0].id;

          // 关联听课人
          for (const listener of listeners) {
            await pool.query(
              'INSERT INTO activity_listeners (activity_id, member_id, created_at) VALUES ($1, $2, CURRENT_TIMESTAMP)',
              [actId, listener.id]
            );
          }

          // 听课记录文字模板
          const defaultNotes = `颍上县耿棚中学教师公开课听课记录与评课反馈

授课人：刘俊杰
课题：Excel应用--合唱评分技巧计算
听课班级：初二年级（2）班
听课时间：2026-09-08
听课地点：信息科技机房2

【课堂观察记录】
1. 导入切入贴近校园生活：执教教师以学校校园艺术节大合唱评分作为真实情境切入，生动直观，能瞬间抓住学生注意力。
2. 逻辑架构清晰明了：由浅入深，先引导学生手算解析评分规则（去掉最高分、去掉最低分求平均），再逐步迁移为Excel函数公式。
3. 巡回指导细致到位：上机实践环节，刘老师穿梭在学生机位之间，及时发现并纠正学生在公式中英文符号混淆等细节错误。
4. 德育融入自然无痕：在讲解统计规则时，适时引导学生理解“客观公正”的价值准则，体现了学科育人的深度。

【评课交流意见】
- 优点：教学设计紧凑，任务驱动明确，学生参与度与上机完成率高，课堂交互氛围良好。
- 建议：在学有余力的拓展环节，可适度引入TRIMMEAN截断平均值函数做拓展对比，进一步拓宽优等生的知识视野。`;

          await pool.query(
            'INSERT INTO listening_notes_templates (activity_id, content, created_at) VALUES ($1, $2, CURRENT_TIMESTAMP)',
            [actId, defaultNotes]
          );

          // 插入已有的现场照片
          const photo1 = '/uploads/activities/1/activity_photos/1789478121_20699435cc62b4bc23b250453aa4391f.jpg';
          const photo2 = '/uploads/activities/1/activity_photos/1789478149_71f5be882881cbf4dc23b08311806c1b.jpg';
          await pool.query(
            `INSERT INTO uploads (activity_id, member_id, file_type, file_name, file_path, uploaded_at)
             VALUES ($1, NULL, 'activity_photo', '机房全景教学照片.jpg', $2, CURRENT_TIMESTAMP),
                    ($1, NULL, 'activity_photo', '合唱评分计算实操.jpg', $3, CURRENT_TIMESTAMP)`,
            [actId, photo1, photo2]
          );

          // 插入默认大模型配置
          await pool.query(
            `INSERT INTO llm_config (name, base_url, api_key, model_name, is_active, created_at)
             VALUES ($1, $2, $3, $4, 1, CURRENT_TIMESTAMP)`,
            ['DeepSeek-V3 默认配置', 'https://api.deepseek.com/v1', 'sk-sample-placeholder', 'deepseek-chat']
          );
        }
      } catch (err) {
        console.error('initDb error (tolerable if tables already exist):', err);
      }
    })();
  }
  await initPromise;
}

// 获取所有成员
export async function getMembers(status?: 'active' | 'inactive'): Promise<Member[]> {
  await initDb();
  if (status) {
    const res = await pool.query('SELECT * FROM members WHERE status = $1 ORDER BY id ASC', [status]);
    return res.rows;
  }
  const res = await pool.query('SELECT * FROM members ORDER BY id ASC');
  return res.rows;
}

// 添加新成员
export async function addMember(name: string): Promise<Member> {
  const res = await pool.query(
    'INSERT INTO members (name, status, created_at) VALUES ($1, $2, CURRENT_TIMESTAMP) RETURNING *',
    [name.trim(), 'active']
  );
  return res.rows[0];
}

// 修改成员姓名
export async function updateMemberName(id: number, newName: string): Promise<Member> {
  const res = await pool.query('UPDATE members SET name = $1 WHERE id = $2 RETURNING *', [newName.trim(), id]);
  return res.rows[0];
}

// 更换为新人（旧成员标记为退出，保留历史记录；新建一个同位新成员）
export async function replaceMemberWithNew(oldId: number, newName: string): Promise<{ oldMember: Member; newMember: Member }> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const oldRes = await client.query("UPDATE members SET status = 'inactive' WHERE id = $1 RETURNING *", [oldId]);
    const newRes = await client.query(
      'INSERT INTO members (name, status, created_at) VALUES ($1, $2, CURRENT_TIMESTAMP) RETURNING *',
      [newName.trim(), 'active']
    );
    await client.query('COMMIT');
    return { oldMember: oldRes.rows[0], newMember: newRes.rows[0] };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// 标记退出/退休
export async function setMemberStatus(id: number, status: 'active' | 'inactive'): Promise<Member> {
  const res = await pool.query('UPDATE members SET status = $1 WHERE id = $2 RETURNING *', [status, id]);
  return res.rows[0];
}

// 获取活动列表
export async function getActivities(options?: { hideBeforeDate?: string | null; tempShowAll?: boolean }): Promise<Activity[]> {
  await initDb();
  let query = `
    SELECT 
      a.id, 
      a.title, 
      a.instructor_id, 
      TO_CHAR(a.activity_date, 'YYYY-MM-DD') as activity_date, 
      a.ai_teaching_plan, 
      a.created_at,
      m.name as instructor_name
    FROM activities a
    LEFT JOIN members m ON a.instructor_id = m.id
  `;

  const values: unknown[] = [];
  if (options?.hideBeforeDate && !options?.tempShowAll) {
    query += ` WHERE a.activity_date >= $1`;
    values.push(options.hideBeforeDate);
  }

  query += ` ORDER BY a.id DESC`;

  const res = await pool.query(query, values);
  const activities: Activity[] = res.rows;

  // 批量获取听课人和上传文件
  for (const act of activities) {
    // 听课人
    const listenersRes = await pool.query(
      `SELECT m.id, m.name, m.status, m.created_at
       FROM activity_listeners al
       JOIN members m ON al.member_id = m.id
       WHERE al.activity_id = $1
       ORDER BY m.id ASC`,
      [act.id]
    );
    act.listeners = listenersRes.rows;

    // 上传文件
    const uploadsRes = await pool.query(
      `SELECT u.*, m.name as member_name
       FROM uploads u
       LEFT JOIN members m ON u.member_id = m.id
       WHERE u.activity_id = $1
       ORDER BY u.id ASC`,
      [act.id]
    );
    act.uploads = uploadsRes.rows;

    // 听课记录模板
    const templateRes = await pool.query(
      `SELECT content FROM listening_notes_templates WHERE activity_id = $1 ORDER BY id DESC LIMIT 1`,
      [act.id]
    );
    act.listening_notes_template = templateRes.rows[0]?.content || null;
  }

  return activities;
}

// 获取单条活动
export async function getActivityById(id: number): Promise<Activity | null> {
  const res = await pool.query(
    `SELECT 
      a.id, 
      a.title, 
      a.instructor_id, 
      TO_CHAR(a.activity_date, 'YYYY-MM-DD') as activity_date, 
      a.ai_teaching_plan, 
      a.created_at,
      m.name as instructor_name
    FROM activities a
    LEFT JOIN members m ON a.instructor_id = m.id
    WHERE a.id = $1`,
    [id]
  );

  if (res.rows.length === 0) return null;
  const act = res.rows[0];

  const listenersRes = await pool.query(
    `SELECT m.id, m.name, m.status, m.created_at
     FROM activity_listeners al
     JOIN members m ON al.member_id = m.id
     WHERE al.activity_id = $1
     ORDER BY m.id ASC`,
    [act.id]
  );
  act.listeners = listenersRes.rows;

  const uploadsRes = await pool.query(
    `SELECT u.*, m.name as member_name
     FROM uploads u
     LEFT JOIN members m ON u.member_id = m.id
     WHERE u.activity_id = $1
     ORDER BY u.id ASC`,
    [act.id]
  );
  act.uploads = uploadsRes.rows;

  const templateRes = await pool.query(
    `SELECT content FROM listening_notes_templates WHERE activity_id = $1 ORDER BY id DESC LIMIT 1`,
    [act.id]
  );
  act.listening_notes_template = templateRes.rows[0]?.content || null;

  return act;
}

// 创建新活动
export async function createActivity(data: {
  title: string;
  instructor_id: number;
  activity_date: string;
  listener_ids: number[];
  ai_teaching_plan?: string;
  ai_listening_note?: string;
}): Promise<Activity> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const actRes = await client.query(
      `INSERT INTO activities (title, instructor_id, activity_date, ai_teaching_plan, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       RETURNING *`,
      [data.title.trim(), data.instructor_id, data.activity_date, data.ai_teaching_plan || null]
    );
    const newAct = actRes.rows[0];

    // 插入听课人
    for (const lid of data.listener_ids) {
      if (lid !== data.instructor_id) {
        await client.query(
          `INSERT INTO activity_listeners (activity_id, member_id, created_at)
           VALUES ($1, $2, CURRENT_TIMESTAMP)`,
          [newAct.id, lid]
        );
      }
    }

    // 插入初始听课记录样例
    if (data.ai_listening_note) {
      await client.query(
        `INSERT INTO listening_notes_templates (activity_id, content, created_at, updated_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [newAct.id, data.ai_listening_note]
      );
    }

    await client.query('COMMIT');
    return await getActivityById(newAct.id) as Activity;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// 删除活动
export async function deleteActivity(id: number): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM uploads WHERE activity_id = $1', [id]);
    await client.query('DELETE FROM activity_listeners WHERE activity_id = $1', [id]);
    await client.query('DELETE FROM listening_notes_templates WHERE activity_id = $1', [id]);
    await client.query('DELETE FROM activities WHERE id = $1', [id]);
    await client.query('COMMIT');
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// 上传记录管理
export async function addUploadRecord(data: {
  activity_id: number;
  member_id?: number | null;
  file_type: string;
  file_name: string;
  file_path: string;
}): Promise<UploadItem> {
  const res = await pool.query(
    `INSERT INTO uploads (activity_id, member_id, file_type, file_name, file_path, uploaded_at)
     VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
     RETURNING *`,
    [data.activity_id, data.member_id || null, data.file_type, data.file_name, data.file_path]
  );
  return res.rows[0];
}

// 删除上传记录
export async function deleteUploadRecord(id: number): Promise<boolean> {
  const res = await pool.query('DELETE FROM uploads WHERE id = $1 RETURNING id', [id]);
  return (res.rowCount ?? 0) > 0;
}

// 保存/更新听课记录样例
export async function saveListeningNoteTemplate(activityId: number, content: string): Promise<void> {
  const existing = await pool.query('SELECT id FROM listening_notes_templates WHERE activity_id = $1', [activityId]);
  if (existing.rows.length > 0) {
    await pool.query(
      'UPDATE listening_notes_templates SET content = $1, updated_at = CURRENT_TIMESTAMP WHERE activity_id = $2',
      [content, activityId]
    );
  } else {
    await pool.query(
      'INSERT INTO listening_notes_templates (activity_id, content, created_at, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
      [activityId, content]
    );
  }
}

// 更新教案内容
export async function updateTeachingPlan(activityId: number, content: string): Promise<void> {
  await pool.query('UPDATE activities SET ai_teaching_plan = $1 WHERE id = $2', [content, activityId]);
}

// 大模型配置管理
export async function getLlmConfigs(): Promise<LlmConfig[]> {
  const res = await pool.query('SELECT * FROM llm_config ORDER BY id ASC');
  return res.rows;
}

export async function addLlmConfig(data: {
  name: string;
  base_url: string;
  api_key: string;
  model_name: string;
  is_active?: number;
}): Promise<LlmConfig> {
  const res = await pool.query(
    `INSERT INTO llm_config (name, base_url, api_key, model_name, is_active, created_at)
     VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
     RETURNING *`,
    [data.name.trim(), data.base_url.trim(), data.api_key.trim(), data.model_name.trim(), data.is_active ? 1 : 0]
  );
  return res.rows[0];
}

export async function setActiveLlmConfig(id: number): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE llm_config SET is_active = 0');
    await client.query('UPDATE llm_config SET is_active = 1 WHERE id = $1', [id]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteLlmConfig(id: number): Promise<boolean> {
  const res = await pool.query('DELETE FROM llm_config WHERE id = $1 RETURNING id', [id]);
  return (res.rowCount ?? 0) > 0;
}

export async function getActiveLlmConfig(): Promise<LlmConfig | null> {
  const res = await pool.query('SELECT * FROM llm_config WHERE is_active = 1 ORDER BY id DESC LIMIT 1');
  return res.rows[0] || null;
}

// 系统设置 (如前台隐藏日期等)
export async function getAppSettings(): Promise<Record<string, string>> {
  await initDb();
  const res = await pool.query('SELECT setting_key, setting_value FROM app_settings');
  const result: Record<string, string> = {};
  for (const row of res.rows) {
    result[row.setting_key] = row.setting_value;
  }
  return result;
}

export async function saveAppSetting(key: string, value: string): Promise<void> {
  await pool.query(
    `INSERT INTO app_settings (setting_key, setting_value, updated_at)
     VALUES ($1, $2, CURRENT_TIMESTAMP)
     ON CONFLICT (setting_key) 
     DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = CURRENT_TIMESTAMP`,
    [key, value]
  );
}

export async function removeAppSetting(key: string): Promise<void> {
  await pool.query('DELETE FROM app_settings WHERE setting_key = $1', [key]);
}
