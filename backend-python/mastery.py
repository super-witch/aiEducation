# mastery.py - 掌握度计算模块

def calculate_mastery(previous: int, is_correct: bool, response_time: int, help_count: int) -> int:
    """
    计算新的掌握度
    
    参数:
    previous: 上一次掌握度 (0-100)
    is_correct: 回答是否正确
    response_time: 响应时间（秒）
    help_count: 本次求助次数
    
    返回:
    新的掌握度 (0-100)
    """
    # 第一步：基础分，占40%
    base_score = previous * 0.4
    
    # 第二步：正确性分，占35%
    if is_correct:
        correctness_score = 35
    else:
        correctness_score = 0
    
    # 第三步：速度分，占15%
    if response_time < 10:
        speed_score = 15
    elif response_time < 30:
        speed_score = 8
    else:
        speed_score = 3
    
    # 第四步：求助分，占10%
    if help_count == 0:
        help_score = 10
    elif help_count == 1:
        help_score = 5
    else:
        help_score = 0
    
    # 计算新掌握度
    new_mastery = base_score + correctness_score + speed_score + help_score
    
    # 确保在0-100范围内
    new_mastery = max(0, min(100, int(new_mastery)))
    
    return new_mastery
