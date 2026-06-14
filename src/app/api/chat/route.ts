import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      return NextResponse.json(
        { 
          error: 'Gemini API Key is not configured. Please add your GEMINI_API_KEY in the `.env.local` file at the root of the project.' 
        },
        { status: 500 }
      );
    }

    const { messages, pdfText } = await req.json();

    if (!pdfText) {
      return NextResponse.json(
        { error: 'No PDF text content found. Please upload a PDF file first.' },
        { status: 400 }
      );
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Invalid message history.' },
        { status: 400 }
      );
    }

    // Initialize the Gemini client
    const genAI = new GoogleGenerativeAI(apiKey);

    // Construct detailed instructions, embedding the complete PDF text.
    const systemInstruction = `You are a professional, helpful PDF Chat Assistant.

Here is the complete text extracted from the user's uploaded PDF document:
=========================================
${pdfText}
=========================================

Instructions:
1. Answer the user's questions based ONLY on the document text provided above.
2. If the document doesn't contain the information needed to answer the question, state: "I cannot find the answer to this question in the uploaded document."
3. Do not make up facts, hallucinate, or use external knowledge that cannot be directly verified from the provided text.
4. If the user's request is not a question but a prompt to summarize, outline, or explain parts of the document, fulfill it based strictly on the text.
5. Be concise and precise in your answers, quoting the document if necessary.`;

    // Initialize model with system instructions
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: systemInstruction,
    });

    // Find the index of the first user message.
    // Gemini API requires the history stream to open with a 'user' message (cannot open with 'model').
    const firstUserMsgIndex = messages.findIndex((msg: any) => msg.role === 'user');
    
    // Slice history starting from the first user message (excluding the latest query which is sent separately)
    const validHistory = firstUserMsgIndex !== -1 ? messages.slice(firstUserMsgIndex, -1) : [];

    // Formulate history in the structure required by Gemini API.
    const chatHistory = validHistory.map((msg: any) => {
      const role = msg.role === 'assistant' ? 'model' : 'user';
      return {
        role: role,
        parts: [{ text: msg.content }],
      };
    });

    const lastMessage = messages[messages.length - 1].content;

    // Start a chat session with the historical context
    const chat = model.startChat({
      history: chatHistory,
    });

    // Send the latest message and wait for the response
    const result = await chat.sendMessage(lastMessage);
    const response = await result.response;
    const responseText = response.text();

    return NextResponse.json({
      content: responseText,
    });
  } catch (error: any) {
    console.error('Error during chat processing:', error);
    return NextResponse.json(
      { error: `Chat request failed. Reason: ${error.message || 'Unknown LLM API error'}` },
      { status: 500 }
    );
  }
}
