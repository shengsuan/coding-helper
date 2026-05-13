/**
 * 将 URL 转换为合法的文件名
 * @param url 输入的 URL 字符串
 * @param replacement 替换非法字符的符号，默认为下划线 '_'
 * @returns 格式化后的合法文件名
 */
export function fmtUrlToFileName(url: string, replacement: string = '_'): string {
  try {
    let name = url.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '');

    // 2. 替换操作系统禁用的非法字符
    // 非法字符包括: / \ : * ? " < > |
    const illegalRegex = /[\/\?<>\\:\*\|":]/g;
    name = name.replace(illegalRegex, replacement);

    // 3. 处理控制字符 (ASCII 0-31)
    const controlRegex = /[\x00-\x1f\x80-\x9f]/g;
    name = name.replace(controlRegex, '');

    // 4. 处理 Windows 保留文件名 (如 CON, PRN, AUX, NUL 等)
    const reservedNames = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;
    if (reservedNames.test(name)) {
      name = `file_${name}`;
    }

    // 5. 限制长度 (大多数文件系统限制为 255 字符，留点余量取 200)
    if (name.length > 200) {
      name = name.substring(0, 200);
    }

    // 6. 如果结果为空（比如输入全是特殊符号），给个默认值
    return name || 'none';
  } catch (error) {
    return 'none';
  }
}

// --- 使用示例 ---
// console.log(fmtUrlToFileName("https://www.google.com/search?q=typescript")); 
// 输出: google.com_search_q=typescript

// console.log(fmtUrlToFileName("http://localhost:8080/api/v1/user")); 
// 输出: localhost_8080_api_v1_user

// console.log(fmtUrlToFileName("con")); 
// 输出: file_con (处理了 Windows 保留名)