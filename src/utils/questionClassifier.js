class QuestionClassifier {
  static classify(question) {
    if (!question || typeof question !== 'string') {
      return 'coding'; // default
    }
    const q = question.toLowerCase();

    // Coding indicators
    const codingKeywords = [
      'write code', 'algorithm', 'sort', 'search', 'tree', 'graph', 'array',
      'string', 'dp', 'dynamic programming', 'recursion', 'implement',
      'leetcode', 'function', 'optimize', 'complexity', 'time', 'space',
    ];

    // LLD indicators
    const lldKeywords = [
      'design', 'class', 'interface', 'architecture', 'pattern', 'oop',
      'low level', 'lld', 'system', 'cache', 'queue', 'notification',
      'parking lot', 'hotel booking', 'atm', 'vending machine',
    ];

    // HLD indicators
    const hldKeywords = [
      'scale', 'million users', 'distributed', 'sharding', 'replication',
      'database', 'load balancing', 'message queue', 'microservices',
      'high level', 'hld', 'backend', 'infrastructure', 'latency',
      'throughput', 'availability',
    ];

    // Behavioral indicators
    const behavioralKeywords = [
      'tell me about', 'example', 'experience', 'conflict', 'failure',
      'learned', 'proud of', 'disagree', 'challenge', 'motivation',
      'team', 'leadership', 'star', 'behavioral',
    ];

    let scores = { coding: 0, lld: 0, hld: 0, behavioral: 0 };

    codingKeywords.forEach((kw) => {
      if (q.includes(kw)) scores.coding += 2;
    });
    lldKeywords.forEach((kw) => {
      if (q.includes(kw)) scores.lld += 2;
    });
    hldKeywords.forEach((kw) => {
      if (q.includes(kw)) scores.hld += 2;
    });
    behavioralKeywords.forEach((kw) => {
      if (q.includes(kw)) scores.behavioral += 2;
    });

    const maxScore = Math.max(...Object.values(scores));
    const classified = Object.keys(scores).find((key) => scores[key] === maxScore);

    return classified || 'coding';
  }
}

module.exports = QuestionClassifier;
