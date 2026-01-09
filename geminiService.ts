
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

export async function suggestLayout(description: string) {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `作为一名资深云架构师，请根据以下需求描述，规划一个合理的 2D 拓扑布局。
    需求描述: ${description}
    
    输出要求:
    1. 返回一个包含 nodes 和 connections 的 JSON 对象。
    2. nodes 数组包含: name (服务名), type (取值范围: database, server, gateway, cache, load_balancer, firewall), x, y (坐标，建议在 0-20 之间)。
    3. connections 数组包含: sourceIndex (起始节点索引), targetIndex (目标节点索引), label (连接描述)。`,
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
                name: { type: Type.STRING },
                type: { type: Type.STRING },
                x: { type: Type.NUMBER },
                y: { type: Type.NUMBER }
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
                label: { type: Type.STRING }
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
    console.error("AI 响应解析失败", e);
    return { nodes: [], connections: [] };
  }
}
