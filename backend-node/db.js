// 引入需要的模块
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 设置数据库文件路径，存放在data文件夹下的tutor.db
const dbPath = path.join(__dirname, '../data/tutor.db');
const db = new sqlite3.Database(dbPath);

// 创建所有需要的表
db.serialize(() => {
    // -------------------------------------------------------------
    // 【核心动态数据表】(运行时会频繁增删改查的表，通常与用户行为挂钩)
    // -------------------------------------------------------------

    // 用户表：存储用户ID和注册时间
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // 掌握度记录表：存储每次学习后的掌握度 (核心表：每次跟AI交互都会新增记录)
    db.run(`CREATE TABLE IF NOT EXISTS mastery_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        knowledge_id TEXT,
        mastery_value INTEGER,
        interaction_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_correct BOOLEAN,
        response_time INTEGER,
        help_count INTEGER
    )`);
    
    // 用户当前掌握度表：快速查询用 (核心表：存储每个知识点的最新掌握情况)
    db.run(`CREATE TABLE IF NOT EXISTS user_mastery (
        user_id TEXT,
        knowledge_id TEXT,
        mastery_value INTEGER,
        last_update TIMESTAMP,
        PRIMARY KEY (user_id, knowledge_id)
    )`);
    
    // 对话历史表：存储一问一答的记录 (核心表：追溯每次教与学的上下文)
    db.run(`CREATE TABLE IF NOT EXISTS chat_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        problem_id TEXT,
        knowledge_id TEXT,
        question TEXT,
        answer TEXT,
        is_correct BOOLEAN,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // 博文表：存储用户发布的博文
    db.run(`CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        title TEXT,
        content TEXT,
        knowledge_id TEXT,
        likes INTEGER DEFAULT 0,
        comment_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // 评论表：存储博文的评论
    db.run(`CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        post_id TEXT,
        user_id TEXT,
        persona_id INTEGER,
        content TEXT,
        likes INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);


    // -------------------------------------------------------------
    // 【基础配置及静态资源表】(后期可能需要不断补充/修改系统内容的表)
    // 需要后期不断录入新知识点、视频、卡片及各种角色的地方放在后半部分
    // -------------------------------------------------------------

    // 视频映射表：知识点ID对应视频文件
    db.run(`CREATE TABLE IF NOT EXISTS video_mappings (
        knowledge_id TEXT PRIMARY KEY,
        video_url TEXT,
        duration INTEGER,
        description TEXT
    )`);
    
    // 知识卡片表：知识点ID对应卡片内容
    db.run(`CREATE TABLE IF NOT EXISTS knowledge_cards (
        knowledge_id TEXT PRIMARY KEY,
        title TEXT,
        content_markdown TEXT,
        summary TEXT
    )`);

    // 人设表：预置AI评论的各种人设
    db.run(`CREATE TABLE IF NOT EXISTS personas (
        id INTEGER PRIMARY KEY,
        name TEXT,
        style TEXT,
        avatar TEXT
    )`);

    // ================= 初始化系统默认数据 ===================
    
    // 初始化人设数据 (后续如果要加新人设可以添加到这里)
    db.get(`SELECT COUNT(*) as count FROM personas`, (err, row) => {
        if (row && row.count === 0) {
            const personas = [
                [1, '考研二战学长', '鼓励型，分享经验', '🎓'],
                [2, '同届学酥', '同辈共鸣，请教细节', '📚'],
                [3, '408卷王', '挑战型，指出可优化点', '⚡'],
                [4, '佛系备考人', '温和肯定', '🍵'],
                [5, '跨考小白', '好奇提问', '🌱'],
                [6, '上岸学姐', '干货补充', '✨']
            ];
            const stmt = db.prepare(`INSERT INTO personas (id, name, style, avatar) VALUES (?, ?, ?, ?)`);
            personas.forEach(p => stmt.run(p));
            stmt.finalize();
            console.log("【初始化】AI评论人设数据已录入。");
        }
    });
    
    // 初始化视频映射示例数据 (后续随课程增加，在此处加数据)
    db.get(`SELECT COUNT(*) as count FROM video_mappings`, (err, row) => {
        if (row && row.count === 0) {
            const videos = [
                ['SORT_02', '/resources/videos/SORT_02.mp4', 28, '快速排序分区过程动画演示'],
                ['TREE_01', '/resources/videos/TREE_01.mp4', 32, '二叉树前中后序遍历'],
                ['LIST_01', '/resources/videos/LIST_01.mp4', 25, '单链表插入删除操作'],
                ['STACK_01', '/resources/videos/STACK_01.mp4', 30, '栈的压入弹出操作'],
                ['SEARCH_01', '/resources/videos/SEARCH_01.mp4', 22, '二分查找过程']
            ];
            const stmt = db.prepare(`INSERT INTO video_mappings (knowledge_id, video_url, duration, description) VALUES (?, ?, ?, ?)`);
            videos.forEach(v => stmt.run(v));
            stmt.finalize();
            console.log("【初始化】视频映射测试数据已录入。");
        }
    });
    
    // 初始化知识卡片示例数据 (后续随课程增加，在此处加数据)
    db.get(`SELECT COUNT(*) as count FROM knowledge_cards`, (err, row) => {
        if (row && row.count === 0) {
            const cards = [
                ['SORT_02', '快速排序', '# 快速排序\n\n## 核心概念\n快速排序是一种分治算法...', '分治算法，递归划分'],
                ['TREE_01', '二叉树遍历', '# 二叉树遍历\n\n## 三种遍历方式\n前序：根左右...', '前序中序后序']
            ];
            const stmt = db.prepare(`INSERT INTO knowledge_cards (knowledge_id, title, content_markdown, summary) VALUES (?, ?, ?, ?)`);
            cards.forEach(c => stmt.run(c));
            stmt.finalize();
            console.log("【初始化】知识卡片测试数据已录入。");
        }
    });
});

// 导出数据库操作函数供其他文件使用
module.exports = {
    db,
    // ----------- 用户状态及掌握度区 -----------
    getMastery: (userId, knowledgeId) => {
        return new Promise((resolve, reject) => {
            db.get(`SELECT mastery_value FROM user_mastery WHERE user_id = ? AND knowledge_id = ?`, 
                [userId, knowledgeId], (err, row) => {
                if (err) reject(err);
                resolve(row ? row.mastery_value : 40); // 如果没有记录，默认返回40
            });
        });
    },
    updateMastery: (userId, knowledgeId, newMastery) => {
        return new Promise((resolve, reject) => {
            db.run(`INSERT OR REPLACE INTO user_mastery (user_id, knowledge_id, mastery_value, last_update) 
                    VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
                [userId, knowledgeId, newMastery], (err) => {
                if (err) reject(err);
                resolve();
            });
        });
    },
    saveMasteryRecord: (userId, knowledgeId, masteryValue, isCorrect, responseTime, helpCount) => {
        return new Promise((resolve, reject) => {
            db.run(`INSERT INTO mastery_records (user_id, knowledge_id, mastery_value, is_correct, response_time, help_count) 
                    VALUES (?, ?, ?, ?, ?, ?)`,
                [userId, knowledgeId, masteryValue, isCorrect, responseTime, helpCount], (err) => {
                if (err) reject(err);
                resolve();
            });
        });
    },

    // ----------- 启发式对话记录区 -----------
    saveChat: (userId, problemId, knowledgeId, question, answer, isCorrect) => {
        return new Promise((resolve, reject) => {
            db.run(`INSERT INTO chat_history (user_id, problem_id, knowledge_id, question, answer, is_correct) 
                    VALUES (?, ?, ?, ?, ?, ?)`,
                [userId, problemId, knowledgeId, question, answer, isCorrect], (err) => {
                if (err) reject(err);
                resolve();
            });
        });
    },

    // ----------- 静态资源（卡片、视频）读取区 -----------
    getVideoMapping: (knowledgeId) => {
        return new Promise((resolve, reject) => {
            db.get(`SELECT * FROM video_mappings WHERE knowledge_id = ?`, [knowledgeId], (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });
    },
    getKnowledgeCard: (knowledgeId) => {
        return new Promise((resolve, reject) => {
            db.get(`SELECT * FROM knowledge_cards WHERE knowledge_id = ?`, [knowledgeId], (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });
    },

    // ----------- 社区生态（博文、评论）区 -----------
    savePost: (postId, userId, title, content, knowledgeId, likes, commentCount) => {
        return new Promise((resolve, reject) => {
            db.run(`INSERT INTO posts (id, user_id, title, content, knowledge_id, likes, comment_count) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [postId, userId, title, content, knowledgeId, likes, commentCount], (err) => {
                if (err) reject(err);
                resolve();
            });
        });
    },
    saveComment: (commentId, postId, userId, personaId, content, likes) => {
        return new Promise((resolve, reject) => {
            db.run(`INSERT INTO comments (id, post_id, user_id, persona_id, content, likes) 
                    VALUES (?, ?, ?, ?, ?, ?)`,
                [commentId, postId, userId, personaId, content, likes], (err) => {
                if (err) reject(err);
                resolve();
            });
        });
    },
    getAllPosts: () => {
        return new Promise((resolve, reject) => {
            db.all(`SELECT * FROM posts ORDER BY created_at DESC`, [], (err, rows) => {
                if (err) reject(err);
                resolve(rows || []);
            });
        });
    },
    getPostById: (postId) => {
        return new Promise((resolve, reject) => {
            db.get(`SELECT * FROM posts WHERE id = ?`, [postId], (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });
    },
    getCommentsByPostId: (postId) => {
        return new Promise((resolve, reject) => {
            db.all(`SELECT c.*, p.name as persona_name, p.avatar 
                    FROM comments c 
                    LEFT JOIN personas p ON c.persona_id = p.id 
                    WHERE c.post_id = ? 
                    ORDER BY c.likes DESC`, [postId], (err, rows) => {
                if (err) reject(err);
                resolve(rows || []);
            });
        });
    }
};
