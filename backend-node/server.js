// server.js - Node.js后端主程序

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const db = require('./db');

// 创建Express应用
const app = express();
const PORT = 3000;

// 中间件配置
app.use(cors());  // 允许跨域
app.use(express.json());  // 解析JSON请求体
app.use(express.static(path.join(__dirname, '../frontend')));  // 托管前端静态文件

// 托管资源文件（视频、卡片等）
app.use('/resources', express.static(path.join(__dirname, '../resources')));

// Python服务地址
const PYTHON_URL = 'http://localhost:5000';

// ========== 工具函数 ==========

// 获取或创建用户ID
function getUserId(req) {
    let userId = req.headers['x-user-id'];
    if (!userId) {
        userId = uuidv4();
    }
    return userId;
}

// ========== 题目相关接口 ==========

// 获取内置题库
app.get('/api/problems', (req, res) => {
    const problemsPath = path.join(__dirname, '../data/problems.json');
    
    // 如果题库文件不存在，返回默认题目
    if (!fs.existsSync(problemsPath)) {
        const defaultProblems = [
            { id: 'q001', title: '快速排序分区', content: '请写出快速排序对数组[5,2,8,3,6,1,9,4]进行第一个分区后的结果', knowledge_id: 'SORT_02', difficulty: 'medium' },
            { id: 'q002', title: '二叉树前序遍历', content: '请写出二叉树前序遍历的递归算法', knowledge_id: 'TREE_01', difficulty: 'easy' }
        ];
        return res.json(defaultProblems);
    }
    
    const problems = JSON.parse(fs.readFileSync(problemsPath, 'utf-8'));
    res.json(problems);
});

// 识别用户自带题目
app.post('/api/problem/identify', async (req, res) => {
    const { text } = req.body;
    
    try {
        const response = await axios.post(`${PYTHON_URL}/ai/identify`, { text });
        res.json(response.data);
    } catch (error) {
        console.error('识别题目失败:', error.message);
        // 返回默认值
        res.json({ knowledge_id: 'SORT_02', confidence: 0.5, topic: '快速排序' });
    }
});

// ========== 学习引导接口 ==========

// 一问一答接口
app.post('/api/learn/guide', async (req, res) => {
    const { 
        problem, 
        knowledgeId, 
        history = [], 
        userAnswer, 
        responseTime = 10, 
        helpCount = 0 
    } = req.body;
    
    const userId = getUserId(req);
    
    try {
        // 获取当前掌握度
        const currentMastery = await db.getMastery(userId, knowledgeId);
        
        // 调用Python AI服务
        const aiResponse = await axios.post(`${PYTHON_URL}/ai/guide`, {
            problem,
            knowledgeId,
            history,
            userAnswer,
            previousMastery: currentMastery,
            responseTime,
            helpCount
        });
        
        const { nextQuestion, isCorrect, newMastery, resource, isFinished, evaluation } = aiResponse.data;
        
        // 更新数据库中的掌握度
        await db.updateMastery(userId, knowledgeId, newMastery);
        await db.saveMasteryRecord(userId, knowledgeId, newMastery, isCorrect, responseTime, helpCount);
        
        // 保存对话记录（如果有历史记录，取最后一条的question）
        const lastQuestion = history.length > 0 ? history[history.length - 1].question : '';
        await db.saveChat(userId, problem, knowledgeId, lastQuestion, userAnswer, isCorrect);
        
        // 如果需要推送资源，从数据库获取具体内容
        let finalResource = resource;
        if (resource && resource.type === 'card') {
            const card = await db.getKnowledgeCard(knowledgeId);
            if (card) {
                finalResource = {
                    type: 'card',
                    title: card.title,
                    content: card.content_markdown,
                    summary: card.summary
                };
            }
        } else if (resource && resource.type === 'video') {
            const video = await db.getVideoMapping(knowledgeId);
            if (video) {
                finalResource = {
                    type: 'video',
                    url: video.video_url,
                    duration: video.duration,
                    description: video.description
                };
            }
        }
        
        res.json({
            nextQuestion,
            isCorrect,
            newMastery,
            resource: finalResource,
            isFinished,
            evaluation
        });
        
    } catch (error) {
        console.error('AI引导失败:', error.message);
        res.status(500).json({ error: 'AI服务出错，请稍后重试' });
    }
});

// 获取学习资源（主动请求）
app.get('/api/resource/:knowledgeId', async (req, res) => {
    const { knowledgeId } = req.params;
    const userId = getUserId(req);
    
    const mastery = await db.getMastery(userId, knowledgeId);
    const resourceType = mastery >= 70 ? 'video' : 'card';
    
    if (resourceType === 'video') {
        const video = await db.getVideoMapping(knowledgeId);
        res.json({ type: 'video', data: video });
    } else {
        const card = await db.getKnowledgeCard(knowledgeId);
        res.json({ type: 'card', data: card });
    }
});

// ========== 学习报告接口 ==========

// 获取单次学习的会话报告
app.get('/api/report/session', async (req, res) => {
    const { knowledgeId } = req.query;
    const userId = getUserId(req);
    
    // 获取本次学习的所有掌握度记录
    const records = await new Promise((resolve) => {
        db.db.all(
            `SELECT mastery_value, is_correct, interaction_time 
             FROM mastery_records 
             WHERE user_id = ? AND knowledge_id = ? 
             ORDER BY interaction_time DESC 
             LIMIT 10`,
            [userId, knowledgeId],
            (err, rows) => {
                resolve(rows || []);
            }
        );
    });
    
    // 获取最新的掌握度
    const currentMastery = await db.getMastery(userId, knowledgeId);
    
    // 获取对话记录用于分析薄弱环节
    const chats = await new Promise((resolve) => {
        db.db.all(
            `SELECT question, answer, is_correct 
             FROM chat_history 
             WHERE user_id = ? AND knowledge_id = ? 
             ORDER BY timestamp DESC 
             LIMIT 10`,
            [userId, knowledgeId],
            (err, rows) => {
                resolve(rows || []);
            }
        );
    });
    
    // 计算起始掌握度（取最早的记录，如果没有则默认40）
    let startMastery = 40;
    if (records.length > 0) {
        startMastery = records[records.length - 1].mastery_value;
    }
    
    // 计算正确率
    const correctCount = chats.filter(c => c.is_correct === 1).length;
    const totalCount = chats.length;
    
    // 计算提升幅度
    const improvement = currentMastery - startMastery;
    
    res.json({
        knowledgeId,
        startMastery,
        endMastery: currentMastery,
        improvement,
        correctCount,
        totalCount,
        history: records.reverse(),
        chats: chats
    });
});

// ========== 社区相关接口 ==========

// 获取所有博文
app.get('/api/community/posts', async (req, res) => {
    const posts = await db.getAllPosts();
    res.json(posts);
});

// 获取单篇博文详情
app.get('/api/community/post/:postId', async (req, res) => {
    const { postId } = req.params;
    
    const post = await db.getPostById(postId);
    if (!post) {
        return res.status(404).json({ error: '博文不存在' });
    }
    
    const comments = await db.getCommentsByPostId(postId);
    res.json({ post, comments });
});

// 发布博文
app.post('/api/community/post', async (req, res) => {
    const { knowledgeId, sessionData, editedTitle, editedContent } = req.body;
    const userId = getUserId(req);
    
    try {
        // 调用Python生成博文
        const response = await axios.post(`${PYTHON_URL}/community/generate_post`, {
            knowledgeId,
            sessionData
        });
        
        let { title, content, likes, commentCount } = response.data;
        
        // 如果用户编辑了，使用编辑后的内容
        if (editedTitle) title = editedTitle;
        if (editedContent) content = editedContent;
        
        const postId = uuidv4();
        
        // 保存博文
        await db.savePost(postId, userId, title, content, knowledgeId, likes, commentCount);
        
        // 调用Python生成AI评论
        const commentsResponse = await axios.post(`${PYTHON_URL}/community/generate_comments`, {
            postId,
            title,
            content,
            knowledgeId
        });
        
        // 保存AI生成的评论
        for (const comment of commentsResponse.data.comments) {
            const commentId = uuidv4();
            await db.saveComment(
                commentId,
                postId,
                null,  // user_id为null表示AI生成的评论
                comment.personaId,
                comment.content,
                comment.likes
            );
        }
        
        res.json({ success: true, postId });
        
    } catch (error) {
        console.error('发布博文失败:', error.message);
        res.status(500).json({ error: '发布失败，请稍后重试' });
    }
});

// 点赞博文
app.post('/api/community/like', async (req, res) => {
    const { postId } = req.body;
    
    db.db.run(`UPDATE posts SET likes = likes + 1 WHERE id = ?`, [postId], (err) => {
        if (err) {
            res.status(500).json({ error: '点赞失败' });
        } else {
            res.json({ success: true });
        }
    });
});

// 用户发表评论
app.post('/api/community/comment', async (req, res) => {
    const { postId, content } = req.body;
    const userId = getUserId(req);
    
    const commentId = uuidv4();
    
    db.db.run(
        `INSERT INTO comments (id, post_id, user_id, content, likes) VALUES (?, ?, ?, ?, 0)`,
        [commentId, postId, userId, content],
        (err) => {
            if (err) {
                res.status(500).json({ error: '评论失败' });
            } else {
                // 更新博文的评论数
                db.db.run(`UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?`, [postId]);
                res.json({ success: true, commentId });
            }
        }
    );
});

// 启动服务
app.listen(PORT, () => {
    console.log(`Node.js服务运行在 http://localhost:${PORT}`);
});