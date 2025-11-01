/**
 * 播客电台模块
 * 提供电台分类、电台列表、节目详情等功能
 */

// API基础地址
function getApiBase(): string {
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:3000';
  }
  return 'https://music888-4swa.vercel.app';
}

// 电台接口
export interface Radio {
  id: number;
  name: string;
  picUrl: string;
  programCount: number;
  subCount: number;
  desc?: string;
  category?: string;
  rcmdText?: string;
  dj?: {
    nickname: string;
    avatarUrl: string;
  };
}

// 电台分类接口
export interface RadioCategory {
  id: number;
  name: string;
  pic56x56Url?: string;
  pic84x84Url?: string;
}

// 电台节目接口
export interface RadioProgram {
  id: number;
  name: string;
  coverUrl: string;
  duration: number;
  createTime: number;
  listenerCount: number;
  likedCount: number;
  commentCount: number;
  description?: string;
  dj?: {
    nickname: string;
    avatarUrl: string;
  };
}

/**
 * 获取电台分类
 */
export async function getRadioCategories(): Promise<RadioCategory[]> {
  try {
    const response = await fetch(`${getApiBase()}/dj_catelist`);
    const data = await response.json();
    
    if (data.code === 200 && data.categories) {
      return data.categories.map((item: any) => ({
        id: item.id,
        name: item.name,
        pic56x56Url: item.pic56x56Url,
        pic84x84Url: item.pic84x84Url
      }));
    }
    return [];
  } catch (error) {
    console.error('获取电台分类失败:', error);
    return [];
  }
}

/**
 * 获取推荐电台
 */
export async function getRecommendRadios(): Promise<Radio[]> {
  try {
    const response = await fetch(`${getApiBase()}/dj_recommend`);
    const data = await response.json();
    
    if (data.code === 200 && data.djRadios) {
      return data.djRadios.map((item: any) => ({
        id: item.id,
        name: item.name,
        picUrl: item.picUrl,
        programCount: item.programCount || 0,
        subCount: item.subCount || 0,
        desc: item.desc,
        rcmdText: item.rcmdtext,
        dj: item.dj ? {
          nickname: item.dj.nickname,
          avatarUrl: item.dj.avatarUrl
        } : undefined
      }));
    }
    return [];
  } catch (error) {
    console.error('获取推荐电台失败:', error);
    return [];
  }
}

/**
 * 获取分类推荐电台
 * @param type 电台类型ID
 */
export async function getRadiosByType(type: number): Promise<Radio[]> {
  try {
    const response = await fetch(`${getApiBase()}/dj_recommend_type?type=${type}`);
    const data = await response.json();
    
    if (data.code === 200 && data.djRadios) {
      return data.djRadios.map((item: any) => ({
        id: item.id,
        name: item.name,
        picUrl: item.picUrl,
        programCount: item.programCount || 0,
        subCount: item.subCount || 0,
        desc: item.desc,
        category: item.category,
        dj: item.dj ? {
          nickname: item.dj.nickname,
          avatarUrl: item.dj.avatarUrl
        } : undefined
      }));
    }
    return [];
  } catch (error) {
    console.error('获取分类电台失败:', error);
    return [];
  }
}

/**
 * 获取类别热门电台
 * @param cateId 分类ID
 * @param limit 数量限制
 * @param offset 偏移量
 */
export async function getHotRadios(cateId: number, limit: number = 30, offset: number = 0): Promise<Radio[]> {
  try {
    const response = await fetch(`${getApiBase()}/dj_radio_hot?cateId=${cateId}&limit=${limit}&offset=${offset}`);
    const data = await response.json();
    
    if (data.code === 200 && data.djRadios) {
      return data.djRadios.map((item: any) => ({
        id: item.id,
        name: item.name,
        picUrl: item.picUrl,
        programCount: item.programCount || 0,
        subCount: item.subCount || 0,
        desc: item.desc,
        dj: item.dj ? {
          nickname: item.dj.nickname,
          avatarUrl: item.dj.avatarUrl
        } : undefined
      }));
    }
    return [];
  } catch (error) {
    console.error('获取热门电台失败:', error);
    return [];
  }
}

/**
 * 获取电台节目列表
 * @param rid 电台ID
 * @param limit 数量限制
 * @param offset 偏移量
 */
export async function getRadioPrograms(rid: number, limit: number = 30, offset: number = 0): Promise<RadioProgram[]> {
  try {
    const response = await fetch(`${getApiBase()}/dj_program?rid=${rid}&limit=${limit}&offset=${offset}`);
    const data = await response.json();
    
    if (data.code === 200 && data.programs) {
      return data.programs.map((item: any) => ({
        id: item.id,
        name: item.name,
        coverUrl: item.coverUrl || item.radio?.picUrl,
        duration: item.duration || 0,
        createTime: item.createTime || 0,
        listenerCount: item.listenerCount || 0,
        likedCount: item.likedCount || 0,
        commentCount: item.commentCount || 0,
        description: item.description,
        dj: item.dj ? {
          nickname: item.dj.nickname,
          avatarUrl: item.dj.avatarUrl
        } : undefined
      }));
    }
    return [];
  } catch (error) {
    console.error('获取电台节目失败:', error);
    return [];
  }
}

/**
 * 获取电台详情
 * @param rid 电台ID
 */
export async function getRadioDetail(rid: number): Promise<Radio | null> {
  try {
    const response = await fetch(`${getApiBase()}/dj_detail?rid=${rid}`);
    const data = await response.json();
    
    if (data.code === 200 && data.data) {
      return {
        id: data.data.id,
        name: data.data.name,
        picUrl: data.data.picUrl,
        programCount: data.data.programCount || 0,
        subCount: data.data.subCount || 0,
        desc: data.data.desc,
        dj: data.data.dj ? {
          nickname: data.data.dj.nickname,
          avatarUrl: data.data.dj.avatarUrl
        } : undefined
      };
    }
    return null;
  } catch (error) {
    console.error('获取电台详情失败:', error);
    return null;
  }
}

/**
 * 获取电台节目排行榜
 * @param limit 数量限制
 * @param offset 偏移量
 */
export async function getProgramToplist(limit: number = 100, offset: number = 0): Promise<RadioProgram[]> {
  try {
    const response = await fetch(`${getApiBase()}/dj_program_toplist?limit=${limit}&offset=${offset}`);
    const data = await response.json();
    
    if (data.code === 200 && data.toplist) {
      return data.toplist.map((item: any) => ({
        id: item.program.id,
        name: item.program.name,
        coverUrl: item.program.coverUrl,
        duration: item.program.duration || 0,
        createTime: item.program.createTime || 0,
        listenerCount: item.program.listenerCount || 0,
        likedCount: item.program.likedCount || 0,
        commentCount: item.program.commentCount || 0,
        description: item.program.description,
        dj: item.program.dj ? {
          nickname: item.program.dj.nickname,
          avatarUrl: item.program.dj.avatarUrl
        } : undefined
      }));
    }
    return [];
  } catch (error) {
    console.error('获取节目排行榜失败:', error);
    return [];
  }
}

/**
 * 格式化数字
 */
export function formatNumber(num: number): string {
  if (num >= 100000000) {
    return (num / 100000000).toFixed(1) + '亿';
  } else if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万';
  }
  return num.toString();
}

/**
 * 格式化时长
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * 格式化日期
 */
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) {
    return '今天';
  } else if (days === 1) {
    return '昨天';
  } else if (days < 7) {
    return `${days}天前`;
  } else {
    return date.toLocaleDateString('zh-CN');
  }
}

/**
 * 渲染电台分类
 */
export async function renderRadioCategories(containerId: string, onSelect: (id: number, name: string) => void): Promise<void> {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = '<div class="loading">加载中...</div>';
  
  const categories = await getRadioCategories();
  
  if (categories.length === 0) {
    container.innerHTML = '<div class="empty">暂无分类</div>';
    return;
  }
  
  const html = `
    <div class="radio-categories">
      <button class="category-btn active" data-id="0">推荐</button>
      ${categories.map(cat => `
        <button class="category-btn" data-id="${cat.id}">
          ${cat.name}
        </button>
      `).join('')}
    </div>
  `;
  
  container.innerHTML = html;
  
  // 绑定事件
  container.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      container.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
      (e.target as HTMLElement).classList.add('active');
      const id = parseInt((e.target as HTMLElement).dataset.id || '0');
      const name = (e.target as HTMLElement).textContent || '';
      onSelect(id, name);
    });
  });
}

/**
 * 渲染推荐电台
 */
export async function renderRecommendRadios(containerId: string): Promise<void> {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = '<div class="loading">加载中...</div>';
  
  const radios = await getRecommendRadios();
  
  if (radios.length === 0) {
    container.innerHTML = '<div class="empty">暂无推荐电台</div>';
    return;
  }
  
  const html = `
    <div class="radio-grid">
      ${radios.map(radio => `
        <div class="radio-card" data-id="${radio.id}">
          <div class="radio-cover">
            <img src="${radio.picUrl}" alt="${radio.name}" loading="lazy">
            <div class="radio-overlay">
              <button class="play-btn" data-id="${radio.id}">播放</button>
            </div>
          </div>
          <div class="radio-info">
            <h3 class="radio-name" title="${radio.name}">${radio.name}</h3>
            ${radio.rcmdText ? `<p class="radio-rcmd">${radio.rcmdText}</p>` : ''}
            <div class="radio-meta">
              <span>节目: ${radio.programCount}</span>
              <span>订阅: ${formatNumber(radio.subCount)}</span>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
  
  container.innerHTML = html;
  
  // 绑定事件
  container.querySelectorAll('.radio-card, .play-btn').forEach(el => {
    el.addEventListener('click', async (e) => {
      const id = parseInt((e.currentTarget as HTMLElement).dataset.id || '0');
      document.dispatchEvent(new CustomEvent('openRadio', { detail: { id } }));
    });
  });
}

/**
 * 渲染热门电台
 */
export async function renderHotRadios(containerId: string, cateId: number): Promise<void> {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = '<div class="loading">加载中...</div>';
  
  const radios = await getHotRadios(cateId);
  
  if (radios.length === 0) {
    container.innerHTML = '<div class="empty">暂无电台</div>';
    return;
  }
  
  const html = `
    <div class="radio-grid">
      ${radios.map(radio => `
        <div class="radio-card" data-id="${radio.id}">
          <div class="radio-cover">
            <img src="${radio.picUrl}" alt="${radio.name}" loading="lazy">
            <div class="radio-overlay">
              <button class="play-btn" data-id="${radio.id}">播放</button>
            </div>
          </div>
          <div class="radio-info">
            <h3 class="radio-name" title="${radio.name}">${radio.name}</h3>
            ${radio.dj ? `<p class="radio-dj">by ${radio.dj.nickname}</p>` : ''}
            <div class="radio-meta">
              <span>节目: ${radio.programCount}</span>
              <span>订阅: ${formatNumber(radio.subCount)}</span>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
  
  container.innerHTML = html;
  
  // 绑定事件
  container.querySelectorAll('.radio-card, .play-btn').forEach(el => {
    el.addEventListener('click', async (e) => {
      const id = parseInt((e.currentTarget as HTMLElement).dataset.id || '0');
      document.dispatchEvent(new CustomEvent('openRadio', { detail: { id } }));
    });
  });
}

/**
 * 渲染电台节目列表
 */
export async function renderRadioPrograms(containerId: string, rid: number): Promise<void> {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = '<div class="loading">加载中...</div>';
  
  const programs = await getRadioPrograms(rid);
  
  if (programs.length === 0) {
    container.innerHTML = '<div class="empty">暂无节目</div>';
    return;
  }
  
  const html = `
    <div class="program-list">
      ${programs.map((program, index) => `
        <div class="program-item" data-id="${program.id}">
          <div class="program-index">${(index + 1).toString().padStart(2, '0')}</div>
          <img src="${program.coverUrl}?param=60x60" alt="${program.name}" class="program-cover">
          <div class="program-info">
            <div class="program-name">${program.name}</div>
            <div class="program-meta">
              <span>${formatDate(program.createTime)}</span>
              <span>▶ ${formatNumber(program.listenerCount)}</span>
              <span>♥ ${formatNumber(program.likedCount)}</span>
            </div>
          </div>
          <div class="program-duration">${formatDuration(program.duration)}</div>
          <button class="program-play-btn" data-id="${program.id}">播放</button>
        </div>
      `).join('')}
    </div>
  `;
  
  container.innerHTML = html;
  
  // 绑定事件
  container.querySelectorAll('.program-play-btn, .program-item').forEach(el => {
    el.addEventListener('click', (e) => {
      const id = parseInt((e.currentTarget as HTMLElement).dataset.id || '0');
      const program = programs.find(p => p.id === id);
      if (program) {
        document.dispatchEvent(new CustomEvent('playProgram', { detail: { program } }));
      }
    });
  });
}