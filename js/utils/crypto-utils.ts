/**
 * Listen 1 加密工具模块
 * 从Listen 1 Chrome扩展移植的核心加密功能
 * 支持网易云音乐的 weapi 和 eapi 加密
 */

import * as forge from 'node-forge';

/**
 * 网易云音乐加密工具类
 */
export class NeteaseCrypto {
  /**
   * 生成随机密钥
   */
  static _create_secret_key(size: number): string {
    const result = [];
    const choice = '012345679abcdef'.split('');
    for (let i = 0; i < size; i += 1) {
      const index = Math.floor(Math.random() * choice.length);
      result.push(choice[index]);
    }
    return result.join('');
  }

  /**
   * AES加密
   */
  static _aes_encrypt(text: string, sec_key: string, algo: string): any {
    const cipher = forge.cipher.createCipher(algo as forge.cipher.Algorithm, sec_key);
    cipher.start({ iv: '0102030405060708' });
    cipher.update(forge.util.createBuffer(text));
    cipher.finish();
    return cipher.output;
  }

  /**
   * RSA加密
   */
  static _rsa_encrypt(text: string, pubKey: string, modulus: string): string {
    const reversedText = text.split('').reverse().join('');
    const n = new forge.jsbn.BigInteger(modulus, 16);
    const e = new forge.jsbn.BigInteger(pubKey, 16);
    const b = new forge.jsbn.BigInteger(forge.util.bytesToHex(reversedText), 16);
    const enc = b.modPow(e, n).toString(16).padStart(256, '0');
    return enc;
  }

  /**
   * 网易云音乐 weapi 加密
   * 用于大部分API请求
   */
  static weapi(text: any): { params: string; encSecKey: string } {
    const modulus =
      '00e0b509f6259df8642dbc35662901477df22677ec152b5ff68ace615bb7b72' +
      '5152b3ab17a876aea8a5aa76d2e417629ec4ee341f56135fccf695280104e0312ecbd' +
      'a92557c93870114af6c9d05c4f7f0c3685b7a46bee255932575cce10b424d813cfe48' +
      '75d3e82047b97ddef52741d546b8e289dc6935b3ece0462db0a22b8e7';
    const nonce = '0CoJUm6Qyw8W8jud';
    const pubKey = '010001';

    const jsonText = JSON.stringify(text);
    const sec_key = this._create_secret_key(16);

    const enc_text = btoa(
      this._aes_encrypt(
        btoa(this._aes_encrypt(jsonText, nonce, 'AES-CBC').data),
        sec_key,
        'AES-CBC'
      ).data
    );

    const enc_sec_key = this._rsa_encrypt(sec_key, pubKey, modulus);

    return {
      params: enc_text,
      encSecKey: enc_sec_key,
    };
  }

  /**
   * 网易云音乐 eapi 加密
   * 用于部分特殊API，如歌词获取
   */
  static eapi(url: string, object: any): { params: string } {
    const eapiKey = 'e82ckenh8dichen8';

    const text = typeof object === 'object' ? JSON.stringify(object) : object;
    const message = `nobody${url}use${text}md5forencrypt`;
    const digest = forge.md.md5
      .create()
      .update(forge.util.encodeUtf8(message))
      .digest()
      .toHex();
    const data = `${url}-36cd479b6b5-${text}-36cd479b6b5-${digest}`;

    return {
      params: this._aes_encrypt(data, eapiKey, 'AES-ECB').toHex().toUpperCase(),
    };
  }
}

/**
 * 通用加密工具函数
 */
export class CryptoUtils {
  /**
   * MD5 哈希
   */
  static md5(text: string): string {
    return forge.md.md5.create().update(text).digest().toHex();
  }

  /**
   * Base64 编码
   */
  static base64Encode(text: string): string {
    return btoa(unescape(encodeURIComponent(text)));
  }

  /**
   * Base64 解码
   */
  static base64Decode(encodedText: string): string {
    return decodeURIComponent(escape(atob(encodedText)));
  }
}

// 导出给浏览器全局使用（临时方案，等待forge库加载）
if (typeof window !== 'undefined') {
  (window as any).NeteaseCrypto = NeteaseCrypto;
  (window as any).CryptoUtils = CryptoUtils;
}