
import { GoogleGenAI, Type } from "@google/genai";

/**
 * 智能布局生成服务
 * 基于 Google Gemini 3 Pro 深度规划拓扑结构
 */

// FIX: Use process.env.API_KEY directly without fallback as per SDK guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function suggestLayout(description: string) {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `你是一名顶级云原生架构师。请根据用户的自然语言描述，生成一套逻辑严密、布局美观的 2D 拓扑结构。
    
    用户描述: ${description}
    
    输出约束:
    1. 坐标系 X/Y 范围为 0 到 15。请确保节点之间有足够的间隔，不要重叠。
    2. 节点类型 type 必须为以下之一: [database, server, gateway, cache, load_balancer, firewall]。
    3. 连接 connections 的 sourceIndex 和 targetIndex 指向 nodes 数组的下标（从0开始）。
    4. 必须严格返回合法的 JSON 对象。`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          nodes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: "服务名称，需简洁明了" },
                type: { type: Type.STRING, description: "服务类型" },
                x: { type: Type.NUMBER, description: "横坐标 0-15" },
                y: { type: Type.NUMBER, description: "纵坐标 0-15" }
              },
              required: ["name", "type", "x", "y"]
            }
          },
          connections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                sourceIndex: { type: Type.NUMBER },
                targetIndex: { type: Type.NUMBER },
                label: { type: Type.STRING, description: "连接的协议或功能描述" }
              },
              required: ["sourceIndex", "targetIndex", "label"]
            }
          }
        },
        required: ["nodes", "connections"]
      }
    }
  });

  try {
    return JSON.parse(response.text || "{\"nodes\":[], \"connections\":[]}");
  } catch (e) {
    console.error("AI 响应 JSON 解析异常:", e);
    throw new Error("AI 生成的架构定义无效");
  }
}
