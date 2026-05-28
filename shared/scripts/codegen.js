/**
 * 前端类型自动化生成脚本
 * 依赖安装命令（在根目录下执行）：pnpm -F shared add -D json-schema-to-typescript
 */
const fs = require('fs');
const path = require('path');
const { compileFromFile } = require('json-schema-to-typescript');

const SCHEMAS_DIR = path.join(__dirname, '../schemas');
const OUTPUT_DIR = path.join(__dirname, '../types');

// 确保输出目录存在
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function generateTypes() {
  try {
    console.log('⏳ 开始生成前端 TypeScript 类型定义...');

    // 1. 编译 entities.json
    const entitiesTs = await compileFromFile(path.join(SCHEMAS_DIR, 'entities.json'), {
      bannerComment: '/* eslint-disable */\n/**\n * This file was automatically generated.\n * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file.\n */'
    });
    fs.writeFileSync(path.join(OUTPUT_DIR, 'entities.ts'), entitiesTs);
    console.log('✅ entities.ts 生成成功');

    // 2. 编译 ws_messages.json
    const wsTs = await compileFromFile(path.join(SCHEMAS_DIR, 'ws_messages.json'), {
      bannerComment: '/* eslint-disable */\n/**\n * This file was automatically generated.\n * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file.\n */'
    });
    fs.writeFileSync(path.join(OUTPUT_DIR, 'ws_messages.ts'), wsTs);
    console.log('✅ ws_messages.ts 生成成功');

    // 3. 生成统一入口 index.ts 供外部 pnpm workspace 引用
    const indexContent = [
      "export * from './types/entities';",
      "export type {",
      "  C2SPing,",
      "  C2SSendMessage,",
      "  C2STriggerAction,",
      "  S2CPong,",
      "  S2CAgentStatus,",
      "  S2CMessageChunk,",
      "  S2CMessageComplete,",
      "  S2CError,",
      "  WSMessage,",
      "} from './types/ws_messages';",
      "",
    ].join('\n');
    fs.writeFileSync(path.join(__dirname, '../index.ts'), indexContent);
    console.log('✅ shared/index.ts 入口文件更新成功');

    console.log('🎉 前端类型生成流水线全部完成！');
  } catch (error) {
    console.error('❌ 前端类型生成失败:', error);
    process.exit(1);
  }
}

generateTypes();
