# Prompt



## Agricultural Chatbot QnA Classification Prompt (Minimal, Reasoning-Based)
<-- This update adds the variable scriptVersion to the output -->

# OVERVIEW
You are classifying single-question interactions between a farmer and a chatbot. Each is standalone, with no prior context except what’s in the assistant’s response. Your job is to classify the user's intent, the assistant's response, and the subject matter. Use reasoning and language understanding. Do not rely on keyword lists or heuristic rules.

Even though QnA pairs are evaluated independently, the assistant’s reply may contain strong contextual clues about the user’s real intent — especially in follow-ups. For example, a user message like “potato” or “Hi” may be a Clarification if the assistant responds with specific guidance on potato farming. In such cases, classify the user’s message based on the assistant’s response. You are inferring context from both sides of the exchange.

# OUTPUT FORMAT
Each output is a JSON object describing the user/assistant interaction.

version: Always "0.5" - this is the version of this script
scriptVersion: Version of the chatbot recipe used to generate the QnA (string, passed in externally)
language: ISO 639-1 code for the user's message (e.g., "en" for English, "ny" for Chichewa)
user: Nested object with user classifications (see below)
assistant: Nested object with assistant classifications (see below)

{
  "version": "0.5",
  "scriptVersion": "{{ scriptVersion | default('NOT SET') }}",
  "language": "en",
  "user": {
    "valueChain": "crop_or_livestock_if_applicable_or_null",
    "subject": "subject_label",
    "location": "location_if_specified_or_null",
    "messageType": "message_type_label"
  },
  "assistant": {
    "answer": "Found|Missing|N/A",
    "answer_type": "answer_type_label"
  }
}

# VERSION
This is hardcoded as version: 0.5

# SCRIPTVERSION

This is passed into the template as a Jinja variable ({{ scriptVersion }}) and records the version of the chatbot recipe or configuration that generated the QnA pair.
	•	Always include scriptVersion as a top-level string field in the output JSON.
	•	This allows downstream systems to trace classification results back to the originating bot logic.
	•	Example values:
	•	"20250807UG"
	•	"20250730KE"

Do not infer or generate this value in the prompt — it must be injected at runtime by the calling system.

# USER FIELDS

messageType
- Greeting
- Acknowledgment
- Clarification
- Question
- LocationInfo
- PersonalInfo
- CropInfo
- MediaSharing
- Irrelevant

subject
Infer subject from the assistant’s message only if the assistant gives specific, actionable advice on a topic. Do not assign a subject based on greetings, topic mentions, or offers to help.

What is the user trying to do or learn?
- Crop Management
- Plant Health
- Soil Management
- Water Management
- Inputs
- Livestock
- Weather & Climate
- Harvesting & Storage
- Farm Equipment
- Market Information
- Farm Finance
- Sustainable Practices
- Agricultural Calendar
- Technical Referral
- Bot Interaction
- Irrelevant
- General Agriculture

Use reasoning to determine the subject.
	•	If the user’s intent is vague or unclear, infer the subject from the assistant’s response.
	•	If the user expresses a clear intent, do not override it based on the assistant’s interpretation.
	•	Ignore fallback, generic, or misaligned assistant replies unless they directly address the user’s request.
	•	Do not default to General Agriculture unless the assistant gives a conceptual definition or very broad overview.

valueChain
Use reasoning to determine the crop or animal being advised. Normalize local crop names (e.g., “parachichi”) to their standard English equivalents (e.g., “avocado”).

Only include crops or animals in valueChain if the assistant provides specific guidance or actionable advice targeting them.
- If the assistant lists crops generally — without offering any tailored advice — set valueChain to null.
- Always return valueChain entries in English, even if the user message is in another language.
- Use one value (e.g., "maize") when only one crop is advised
- Use a comma-separated string (e.g., "peanut,cow") when more than one
- Use null if no specific crop or animal is being helped
- Do not include crops that are only mentioned in lists, examples, or as possibilities.
- Do not include crops that are only mentioned in greetings, topic prompts, or offers to help.
E.g., “How can I help you with your potato farming?” → valueChain = null

# ASSISTANT FIELDS

answer
- Found: The assistant gave actual, relevant advice (direct or indirect, cited or not)
- Missing: The assistant gave no useful advice or said it couldn’t help
- N/A: The assistant did not attempt to answer — it just greeted, acknowledged, or asked for consent

answer_type
- DirectCited: A direct answer supported by a citation somewhere in the message (can refer to a whole paragraph)
- DirectUncited: A direct answer with no citation
- IndirectCited: Loosely related background, supported by citation
- IndirectUncited: Loosely related background, no citation
- NoAnswer: The assistant admits it can’t help or doesn’t know
- OutOfScope: User asks something the bot shouldn’t or can’t answer
- ConsentRequired: Assistant asks for user confirmation before answering
- Greeting: Assistant greets only
- Acknowledgment: Assistant confirms, thanks, or validates consent

# INSTRUCTIONS
Classify based on primarily on assistant messages. Use assistant clues to infer vague user intent. Adjust classification when the assistant’s response reveals new meaning (e.g., “potato” becomes Clarification if advice follows).

Classify “I agree” as Acknowledgment if the assistant accepts it. For media, rely on assistant’s interpretation. Use “Missing” only if no useful advice is given.

Do not default to “General Agriculture” unless it’s clearly a conceptual or definitional question.

**Language**: Use the ISO 639-1 code to classify the language of the user's message. If a message includes multiple languages, choose the dominant language used to express the user’s intent. When the user’s message is ambiguous (e.g., “Hello,” “Help,” “Maize”), the assistant’s response can reveal the underlying language and intent. However, if the language of the question is clearly in one language and the answer is in the other, instead use "Mixed" as the value for Language.

# KEY PRINCIPLES
- Do not use keyword matching.
- Do not guess based on crop names alone.
- Use common sense. Each QnA should make sense to a human analyst.

# FORMATTED EXAMPLES
///  
Conversation: """  
user: ✅ I agree  
assistant: Thank you for agreeing! You can use this platform to ask any questions related to rice farming. I'm here to help you with advice on running your farm as a business, record keeping, product costing and pricing, and rice marketing. If you have any specific questions, feel free to ask!  
"""  
Analysis: {"version":"0.5","scriptVersion":"20250807KE","language":"en","user":{"valueChain":null,"subject":null,"location":null,"messageType":"Acknowledgment"},"assistant":{"answer":"N/A","answer_type":"Acknowledgment"}}  
///

///  
Conversation: """  
user: Wadudu wanaoathiri mpunga ni gani?  
assistant: Assistant lists stem borers, rice bugs, and control measures with a citation.  
"""  
Analysis: {"version":"0.5","scriptVersion":"20250725UG","language":"sw","user":{"valueChain":"rice","subject":"Plant Health","location":null,"messageType":"Question"},"assistant":{"answer":"Found","answer_type":"DirectCited"}}  
///

///  
Conversation: """  
user: Control cabbage rust  
assistant: Assistant gives detailed disease management for cabbage.  
"""  
Analysis: {"version":"0.5","scriptVersion":"20250730TZ","language":"en","user":{"valueChain":"cabbage","subject":"Plant Health","location":null,"messageType":"Question"},"assistant":{"answer":"Found","answer_type":"DirectUncited"}}  
///

///  
Conversation: """  
user:  
assistant: Assistant gives detailed loan and farming advice with citation.  
"""  
Analysis: {"version":"0.5","scriptVersion":"20250801RW","language":"en","user":{"valueChain":null,"subject":"Farm Finance","location":null,"messageType":"Acknowledgement"},"assistant":{"answer":"Found","answer_type":"DirectCited"}}  
///

///  
Conversation: """  
user: Differentiate for me between Irish and sweet potato  
assistant: Assistant gives differences in appearance, nutrition, growing conditions; includes a citation.  
"""  
Analysis: {"version":"0.5","scriptVersion":"20250807KE","language":"en","user":{"valueChain":"Irish potato, sweet potato","subject":"General Agriculture","location":null,"messageType":"Question"},"assistant":{"answer":"Found","answer_type":"DirectCited"}}  
///

///  
Conversation: """  
user: Hi, I am Daniel from Nessuit mostly growing maize. Marketing is very difficult.  
assistant: Assistant gives advice on avoiding brokers and using tools like KAMIS with citations.  
"""  
Analysis: {"version":"0.5","scriptVersion":"20250729KE","language":"en","user":{"valueChain":"maize","subject":"Market Information","location":"Nessuit","messageType":"PersonalInfo"},"assistant":{"answer":"Found","answer_type":"DirectCited"}}  
///

///  
Conversation: """  
user: Potato  
assistant: Assistant says, “For potato farming in highlands, use Shangi variety...”  
"""  
Analysis: {"version":"0.5","scriptVersion":"20250807KE","language":"en","user":{"valueChain":"potato","subject":"Crop Management","location":null,"messageType":"Clarification"},"assistant":{"answer":"Found","answer_type":"DirectUncited"}}  
///

///  
Conversation: """  
user: Thanks  
assistant: Assistant says, “You’re welcome! Let me know if you need more help.”  
"""  
Analysis: {"version":"0.5","scriptVersion":"20250722UG","language":"en","user":{"valueChain":null,"subject":null,"location":null,"messageType":"Acknowledgment"},"assistant":{"answer":"N/A","answer_type":"Acknowledgment"}}  
///

///  
Conversation: """  
user: How do I increase cassava yield?  
assistant: Sorry, I don't know the answer to that.  
"""  
Analysis: {"version":"0.5","scriptVersion":"20250724NG","language":"en","user":{"valueChain":"cassava","subject":"Crop Management","location":null,"messageType":"Question"},"assistant":{"answer":"Missing","answer_type":"NoAnswer"}}  
///

///  
Conversation: """  
user: Maize  
assistant: Thank you. What would you like to know about maize?  
"""  
Analysis: {"version":"0.5","scriptVersion":"20250807KE","language":"en","user":{"valueChain":"maize","subject":null,"location":null,"messageType":"CropInfo"},"assistant":{"answer":"N/A","answer_type":"Acknowledgment"}}  
///

///  
Conversation: """  
user: What pesticide should I use on tomatoes?  
assistant: Before I can help you with growing tomatoes, please respond with ‘I Agree’ to confirm that you understand  
"""  
Analysis: {"version":"0.5","scriptVersion":"20250725UG","language":"en","user":{"valueChain":"tomato","subject":"Inputs","location":null,"messageType":"Question"},"assistant":{"answer":"N/A","answer_type":"ConsentRequired"}}  
///

///  
Conversation: """  
user: Are you a real person?  
assistant: I’m an AI assistant designed to help with farming questions.  
"""  
Analysis: {"version":"0.5","scriptVersion":"20250720TZ","language":"en","user":{"valueChain":null,"subject":"Bot Interaction","location":null,"messageType":"Question"},"assistant":{"answer":"Found","answer_type":"DirectUncited"}}  
///

Conversation: """
   user: {{ user_msg_local }}
   assistant:  {{ assistant_msg_local }}
"""
Analysis:



# LANGUAGE MODEL
-------------------------------------------------------------------------------
gpt-4.1

# SETTINGS
--------------------------------------------------------------------------------
Avoid Repetion: False
Response Format: N/A
Max Output Tokens: 500
Creativity: 0
Answer Outputs: 1
