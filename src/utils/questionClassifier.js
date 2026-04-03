class QuestionClassifier {
  static classify(question) {
    if (!question || typeof question !== 'string') {
      return 'coding'; // default
    }
    const q = question.toLowerCase();

    // [keyword, weight] — higher weight = stronger signal
    const codingKeywords = [
      ['write code', 3], ['algorithm', 3], ['implement', 2], ['leetcode', 3],
      ['dynamic programming', 3], ['recursion', 2], ['binary search', 3],
      ['linked list', 3], ['hash map', 3], ['hash table', 3], ['heap', 2],
      ['stack', 2], ['queue', 2], ['tree', 2], ['graph', 2], ['trie', 3],
      ['sort', 2], ['two pointers', 3], ['sliding window', 3], ['backtracking', 3],
      ['greedy', 2], ['bfs', 3], ['dfs', 3], ['dp', 3],
      ['time complexity', 3], ['space complexity', 3], ['code', 1],
      ['brute force', 2], ['bug fix', 2], ['debug', 2],
    ];

    const lldKeywords = [
      ['class diagram', 4], ['low level design', 4], ['lld', 4],
      ['oop', 3], ['object oriented', 3], ['design pattern', 3],
      ['singleton', 3], ['factory', 3], ['observer', 3], ['strategy pattern', 3],
      ['interface', 2], ['abstract class', 3], ['inheritance', 2],
      ['encapsulation', 3], ['polymorphism', 3],
      ['parking lot', 4], ['hotel booking', 4], ['atm', 3],
      ['vending machine', 4], ['elevator', 3], ['library management', 4],
      ['chess', 3], ['tic tac toe', 3], ['snake and ladder', 4],
      ['solid principles', 3], ['design a class', 4],
    ];

    const hldKeywords = [
      ['system design', 4], ['high level design', 4], ['hld', 4],
      ['scale', 2], ['million users', 4], ['billion', 3],
      ['distributed', 3], ['sharding', 4], ['replication', 3],
      ['load balancing', 4], ['load balancer', 4],
      ['message queue', 3], ['kafka', 3], ['rabbitmq', 3],
      ['microservices', 3], ['monolith', 2],
      ['database', 1], ['sql vs nosql', 3], ['caching', 2], ['redis', 2], ['cdn', 3],
      ['api gateway', 3], ['rate limiter', 4], ['rate limiting', 4],
      ['url shortener', 4], ['design twitter', 4], ['design instagram', 4],
      ['design youtube', 4], ['design uber', 4], ['design whatsapp', 4],
      ['throughput', 2], ['availability', 2], ['latency', 2],
      ['cap theorem', 3], ['consistent hashing', 4],
      ['backend', 1], ['infrastructure', 2],
    ];

    const behavioralKeywords = [
      ['tell me about a time', 5], ['tell me about yourself', 4],
      ['give me an example', 4], ['describe a situation', 4],
      ['how do you handle', 3], ['what would you do', 3],
      ['conflict', 3], ['disagree', 3], ['failure', 3], ['mistake', 3],
      ['challenge', 2], ['difficult', 2], ['proud of', 3],
      ['leadership', 3], ['teamwork', 3], ['collaboration', 2],
      ['motivation', 3], ['strength', 2], ['weakness', 2],
      ['why do you want', 3], ['why should we hire', 3],
      ['behavioral', 3], ['star', 2], ['experience', 1],
    ];

    let scores = { coding: 0, lld: 0, hld: 0, behavioral: 0 };

    codingKeywords.forEach(([kw, weight]) => {
      if (q.includes(kw)) scores.coding += weight;
    });
    lldKeywords.forEach(([kw, weight]) => {
      if (q.includes(kw)) scores.lld += weight;
    });
    hldKeywords.forEach(([kw, weight]) => {
      if (q.includes(kw)) scores.hld += weight;
    });
    behavioralKeywords.forEach(([kw, weight]) => {
      if (q.includes(kw)) scores.behavioral += weight;
    });

    const maxScore = Math.max(...Object.values(scores));

    // If no keywords matched at all, default to coding
    if (maxScore === 0) return 'coding';

    // On tie, prefer: behavioral > hld > lld > coding (coding is the fallback default,
    // so ties should lean toward the more specific category)
    const priority = ['behavioral', 'hld', 'lld', 'coding'];
    for (const cat of priority) {
      if (scores[cat] === maxScore) return cat;
    }

    return 'coding';
  }
}

module.exports = QuestionClassifier;
