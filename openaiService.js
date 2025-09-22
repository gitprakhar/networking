const OpenAI = require('openai');

class OpenAIService {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    }

    async analyzeConversation(conversation) {
        try {
            // Check if OpenAI API key is configured
            if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
                console.log('OpenAI API key not configured, using mock analysis');
                return this.mockAnalysis(conversation);
            }

            // Prepare conversation text for analysis
            const conversationText = conversation.map(email => {
                const direction = email.sender_email === conversation[0].user_email ? 'You' : 'Them';
                return `${direction}: ${email.subject}\n${email.snippet || email.body || ''}`;
            }).join('\n\n');

            const prompt = `
Analyze this email conversation and determine if it's a networking conversation.

A networking conversation includes:
- Professional connections
- Job opportunities
- Career advice
- Industry discussions
- Business partnerships
- Mentorship
- Professional introductions
- Conference/event discussions

Conversation:
${conversationText}

Please respond in JSON format:
{
    "is_networking": true,
    "networking_score": 8,
    "conversation_summary": "Brief summary of the conversation...",
    "networking_type": "job_opportunity"
}
`;

            const response = await this.openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "You are an expert at identifying networking conversations in professional emails. Always respond with valid JSON."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 300
            });

            const analysis = JSON.parse(response.choices[0].message.content);
            return analysis;
        } catch (error) {
            console.error('Error analyzing conversation with OpenAI:', error);
            // Return a mock response if OpenAI fails
            return this.mockAnalysis(conversation);
        }
    }

    mockAnalysis(conversation) {
        // Simple keyword-based analysis for demo purposes
        const conversationText = conversation.map(email => 
            `${email.subject} ${email.snippet || email.body || ''}`
        ).join(' ').toLowerCase();

        const networkingKeywords = [
            'job', 'career', 'opportunity', 'position', 'hiring', 'interview',
            'network', 'connect', 'linkedin', 'meeting', 'coffee', 'chat',
            'mentor', 'advice', 'industry', 'conference', 'event', 'speak',
            'partnership', 'collaborate', 'business', 'startup', 'company'
        ];

        const hasNetworkingKeywords = networkingKeywords.some(keyword => 
            conversationText.includes(keyword)
        );

        return {
            is_networking: hasNetworkingKeywords,
            networking_score: hasNetworkingKeywords ? Math.floor(Math.random() * 4) + 6 : 0,
            conversation_summary: `Conversation about ${conversation[0].subject}`,
            networking_type: hasNetworkingKeywords ? 'professional_connection' : 'unknown'
        };
    }

    async analyzeMultipleConversations(conversations) {
        try {
            const results = [];
            
            for (const conversation of conversations) {
                if (conversation.length === 0) continue;
                
                try {
                    const analysis = await this.analyzeConversation(conversation);
                    
                    // Only include if it's a networking conversation
                    if (analysis.is_networking) {
                        results.push({
                            contact_email: conversation[0].sender_email !== conversation[0].user_email ? 
                                conversation[0].sender_email : conversation[0].recipient_email,
                            contact_name: conversation[0].contact_name || 'Unknown',
                            ...analysis
                        });
                    }
                } catch (error) {
                    console.error(`Error analyzing conversation with ${conversation[0].sender_email}:`, error);
                    // Continue with other conversations
                }
            }
            
            return results;
        } catch (error) {
            console.error('Error analyzing multiple conversations:', error);
            throw error;
        }
    }
}

module.exports = OpenAIService;
