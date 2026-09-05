/**
 * متتبع العادات بأوقات الصلوات المفروضة
 * تطبيق نقي بـ JavaScript/TypeScript و HTML و CSS مع تكامل Firebase Auth & Firestore
 */

import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged, 
  signInAnonymously,
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs 
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// تهيئة Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');

// نوع بيانات الصلاة المفروضة
interface PrayerPeriod {
  id: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
  name: string;
  nameEn: string;
  timeRange: string;
  icon: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  description: string;
  suggestions: { title: string; emoji: string }[];
}

// نوع بيانات العادة
interface Habit {
  id: string;
  prayerId: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
  title: string;
  emoji: string;
  createdAt: string;
}

// تعريف الفترات الخمس بحسب الصلوات المفروضة
const PRAYER_PERIODS: PrayerPeriod[] = [
  {
    id: 'fajr',
    name: 'فترة الفجر',
    nameEn: 'Fajr',
    timeRange: 'من أذان الفجر إلى الضحى',
    icon: '🌅',
    startHour: 4,
    startMinute: 30,
    endHour: 11,
    endMinute: 59,
    description: 'بداية اليوم والبركة والنشاط المبكر',
    suggestions: [
      { title: 'أذكار الصباح كاملة', emoji: '🤲' },
      { title: 'قراءة ورد من القرآن الكريم', emoji: '📖' },
      { title: 'شرب كأسين من الماء الدافئ', emoji: '💧' },
      { title: 'تمارين إطالة وحركة خفيفة', emoji: '🏃‍♂️' },
      { title: 'تدوين أهم 3 أولويات لليوم', emoji: '✍️' }
    ]
  },
  {
    id: 'dhuhr',
    name: 'فترة الظهر',
    nameEn: 'Dhuhr',
    timeRange: 'من أذان الظهر إلى العصر',
    icon: '☀️',
    startHour: 12,
    startMinute: 0,
    endHour: 15,
    endMinute: 29,
    description: 'انتصاف النهار وتجديد الطاقة والتركيز',
    suggestions: [
      { title: 'سنن الظهر الرواتب (٤ قبل واثنتان بعد)', emoji: '🕌' },
      { title: 'وجبة غداء صحية متوازنة', emoji: '🥗' },
      { title: 'قيلولة قصيرة لإنعاش الذهن (١٥ دقيقة)', emoji: '💤' },
      { title: 'إنجاز المهمة الأهم في العمل / الدراسة', emoji: '💻' }
    ]
  },
  {
    id: 'asr',
    name: 'فترة العصر',
    nameEn: 'Asr',
    timeRange: 'من أذان العصر إلى المغرب',
    icon: '⛅',
    startHour: 15,
    startMinute: 30,
    endHour: 18,
    endMinute: 29,
    description: 'ختام مهام النهار والاستعداد للمساء',
    suggestions: [
      { title: 'أذكار المساء', emoji: '🤲' },
      { title: 'مشي أو نشاط بدني في الهواء الطلق', emoji: '🚶‍♂️' },
      { title: 'قراءة نافعة في كتاب أو مهارة', emoji: '📚' },
      { title: 'إنهاء وتلخيص مهام العمل', emoji: '📋' }
    ]
  },
  {
    id: 'maghrib',
    name: 'فترة المغرب',
    nameEn: 'Maghrib',
    timeRange: 'من أذان المغرب إلى العشاء',
    icon: '🌇',
    startHour: 18,
    startMinute: 30,
    endHour: 19,
    endMinute: 59,
    description: 'وقت الأسرة والاسترخاء الذهني والسكينة',
    suggestions: [
      { title: 'جلسة عائلية دافئة بعيداً عن الشاشات', emoji: '👨‍👩‍👧‍👦' },
      { title: 'عشاء خفيف ومغذٍ', emoji: '🍲' },
      { title: 'ذكر الله والدعاء بين الأذان والإقامة', emoji: '🤲' },
      { title: 'صلة رحم أو تفقد الأقارب', emoji: '📞' }
    ]
  },
  {
    id: 'isha',
    name: 'فترة العشاء',
    nameEn: 'Isha',
    timeRange: 'من أذان العشاء إلى النوم والفجر',
    icon: '🌙',
    startHour: 20,
    startMinute: 0,
    endHour: 4,
    endMinute: 29,
    description: 'ختام اليوم ومحاسبة النفس والنوم المبكر',
    suggestions: [
      { title: 'صلاة الشفع والوتر', emoji: '🕌' },
      { title: 'قراءة سورة الملك وأذكار النوم', emoji: '📖' },
      { title: 'مراجعة إنجازات اليوم ومحاسبة النفس', emoji: '📝' },
      { title: 'إغلاق الشاشات قبل النوم بـ ٣٠ دقيقة', emoji: '📵' },
      { title: 'تجهيز ملابس وأولويات الغد', emoji: '🎒' }
    ]
  }
];

// العادات الافتراضية الأولية (فارغة حسب الطلب)
const DEFAULT_HABITS: Habit[] = [];

// مفاتيح التخزين المحلي الاحتياطي
const STORAGE_KEYS = {
  HABITS: 'prayer_habits_list_v4',
  COMPLETIONS: 'prayer_habits_completions_v4'
};

class HabitTrackerApp {
  private habits: Habit[] = [];
  private completions: Record<string, string[]> = {}; // date -> [habitId]
  private currentDate: string = '';
  private currentFilter: string = 'all';
  private selectedEmoji: string = '📖';
  private currentUser: User | null = null;
  private isSyncing: boolean = false;

  constructor() {
    this.initDate();
    this.loadLocalState();
    this.setupAuth();
    this.render();
    this.setupEventListeners();
    this.updateCurrentPrayerBadge();
  }

  private initDate(): void {
    const today = new Date();
    this.currentDate = this.formatDate(today);
  }

  private formatDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private loadLocalState(): void {
    try {
      const savedHabits = localStorage.getItem(STORAGE_KEYS.HABITS);
      if (savedHabits) {
        this.habits = JSON.parse(savedHabits);
      } else {
        this.habits = [...DEFAULT_HABITS];
        this.saveLocalHabits();
      }

      const savedCompletions = localStorage.getItem(STORAGE_KEYS.COMPLETIONS);
      if (savedCompletions) {
        this.completions = JSON.parse(savedCompletions);
      } else {
        this.completions = {};
      }
    } catch (e) {
      console.warn('LocalStorage error', e);
      this.habits = [...DEFAULT_HABITS];
      this.completions = {};
    }
  }

  private saveLocalHabits(): void {
    try {
      localStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(this.habits));
    } catch (e) {
      console.error(e);
    }
  }

  private saveLocalCompletions(): void {
    try {
      localStorage.setItem(STORAGE_KEYS.COMPLETIONS, JSON.stringify(this.completions));
    } catch (e) {
      console.error(e);
    }
  }

  // إعداد المصادقة (Firebase Auth)
  private setupAuth(): void {
    const loginBtn = document.getElementById('btn-login');
    const logoutBtn = document.getElementById('btn-logout');
    const userEmailEl = document.getElementById('user-email');

    loginBtn?.addEventListener('click', async () => {
      try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      } catch (error) {
        console.error('Google Sign-In Error:', error);
        // Fallback to anonymous login if popup is blocked
        try {
          await signInAnonymously(auth);
        } catch (err) {
          alert('تعذر تسجيل الدخول. يرجى التحقق من إعدادات المتصفح.');
        }
      }
    });

    logoutBtn?.addEventListener('click', async () => {
      try {
        await signOut(auth);
      } catch (error) {
        console.error('Sign-Out Error:', error);
      }
    });

    onAuthStateChanged(auth, async (user) => {
      this.currentUser = user;
      if (user) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'inline-flex';
        if (userEmailEl) {
          userEmailEl.textContent = user.email || user.displayName || 'مستخدم مسجل';
          userEmailEl.style.display = 'inline';
        }
        // مزامنة البيانات من سحابة Firestore
        await this.loadFromCloud();
      } else {
        if (loginBtn) loginBtn.style.display = 'inline-flex';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (userEmailEl) userEmailEl.style.display = 'none';
        this.loadLocalState();
        this.render();
      }
    });
  }

  // مزامنة الحفظ مع Firestore
  private async saveData(): Promise<void> {
    this.saveLocalHabits();
    this.saveLocalCompletions();

    if (this.currentUser && !this.isSyncing) {
      try {
        const userDocRef = doc(db, 'users', this.currentUser.uid, 'data', 'v4');
        await setDoc(userDocRef, {
          habits: this.habits,
          completions: this.completions,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (e) {
        console.error('Error saving to Firestore:', e);
      }
    }
  }

  // تحميل البيانات من Firestore للمستخدم المسجل
  private async loadFromCloud(): Promise<void> {
    if (!this.currentUser) return;
    this.isSyncing = true;
    try {
      const userDocRef = doc(db, 'users', this.currentUser.uid, 'data', 'v4');
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.habits && Array.isArray(data.habits)) {
          this.habits = data.habits;
          this.saveLocalHabits();
        }
        if (data.completions) {
          this.completions = data.completions;
          this.saveLocalCompletions();
        }
      } else {
        // أول دخول لهذا المستخدم، يتم رفع البيانات المحلية إن وجدت
        await setDoc(userDocRef, {
          habits: this.habits,
          completions: this.completions,
          createdAt: new Date().toISOString()
        });
      }
    } catch (e) {
      console.error('Error loading from Firestore:', e);
    } finally {
      this.isSyncing = false;
      this.render();
    }
  }

  private getCurrentPrayerPeriod(): PrayerPeriod {
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    for (const period of PRAYER_PERIODS) {
      const start = period.startHour * 60 + period.startMinute;
      const end = period.endHour * 60 + period.endMinute;

      if (start <= end) {
        if (currentMins >= start && currentMins <= end) return period;
      } else {
        if (currentMins >= start || currentMins <= end) return period;
      }
    }
    return PRAYER_PERIODS[0];
  }

  private calculateStreak(): number {
    let streak = 0;
    const checkDate = new Date();
    const todayStr = this.formatDate(checkDate);
    if ((this.completions[todayStr] || []).length > 0) {
      streak++;
    }

    while (true) {
      checkDate.setDate(checkDate.getDate() - 1);
      const prevDateStr = this.formatDate(checkDate);
      if ((this.completions[prevDateStr] || []).length > 0) {
        streak++;
      } else {
        break;
      }
      if (streak > 365) break;
    }
    return streak;
  }

  public toggleHabit(habitId: string): void {
    if (!this.completions[this.currentDate]) {
      this.completions[this.currentDate] = [];
    }

    const list = this.completions[this.currentDate];
    const index = list.indexOf(habitId);

    if (index > -1) {
      list.splice(index, 1);
    } else {
      list.push(habitId);
    }

    this.saveData();
    this.render();
  }

  public addHabit(prayerId: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha', title: string, emoji: string): void {
    const newHabit: Habit = {
      id: 'h_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      prayerId,
      title: title.trim(),
      emoji: emoji || '✨',
      createdAt: this.currentDate
    };

    this.habits.push(newHabit);
    this.saveData();
    this.render();
  }

  public deleteHabit(habitId: string): void {
    if (confirm('هل أنت متأكد من رغبتك في حذف هذه العادة؟')) {
      this.habits = this.habits.filter(h => h.id !== habitId);
      for (const d in this.completions) {
        this.completions[d] = this.completions[d].filter(id => id !== habitId);
      }
      this.saveData();
      this.render();
    }
  }

  public resetToDefaults(): void {
    if (confirm('هل تريد استعادة قائمة العادات الافتراضية؟ لن تُحذف سجلات أيامك السابقة.')) {
      this.habits = [...DEFAULT_HABITS];
      this.saveData();
      this.render();
    }
  }

  public changeDate(deltaDays: number): void {
    const parts = this.currentDate.split('-');
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    d.setDate(d.getDate() + deltaDays);
    this.currentDate = this.formatDate(d);
    this.render();
  }

  public goToToday(): void {
    this.initDate();
    this.render();
  }

  private formatArabicDate(dateStr: string): string {
    const parts = dateStr.split('-');
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    try {
      return d.toLocaleDateString('ar-EG', options);
    } catch {
      return dateStr;
    }
  }

  private updateCurrentPrayerBadge(): void {
    const currentPrayer = this.getCurrentPrayerPeriod();
    const badgeEl = document.getElementById('current-prayer-badge');
    if (badgeEl) {
      badgeEl.innerHTML = `<span>${currentPrayer.icon}</span> <span>الصلاة الحالية: ${currentPrayer.name}</span>`;
    }
  }

  private setupEventListeners(): void {
    const prevDateBtn = document.getElementById('btn-prev-date');
    const nextDateBtn = document.getElementById('btn-next-date');
    const todayBtn = document.getElementById('btn-today');

    prevDateBtn?.addEventListener('click', () => this.changeDate(-1));
    nextDateBtn?.addEventListener('click', () => this.changeDate(1));
    todayBtn?.addEventListener('click', () => this.goToToday());

    const filterTabsContainer = document.getElementById('filter-tabs');
    filterTabsContainer?.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest('.filter-tab') as HTMLElement;
      if (target && target.dataset.filter) {
        this.currentFilter = target.dataset.filter;
        this.render();
      }
    });

    // Event delegation for dynamically rendered prayer sections
    const prayerSectionsContainer = document.getElementById('prayer-sections-container');
    prayerSectionsContainer?.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      
      // Delete Habit
      const deleteBtn = target.closest('.habit-btn-delete');
      if (deleteBtn) {
        const habitId = (deleteBtn.closest('.habit-item') as HTMLElement)?.dataset.habitId;
        if (habitId) this.deleteHabit(habitId);
        return;
      }
      
      // Toggle Habit
      const contentWrap = target.closest('.habit-content-wrap');
      if (contentWrap) {
        const habitId = (contentWrap.closest('.habit-item') as HTMLElement)?.dataset.habitId;
        if (habitId) this.toggleHabit(habitId);
        return;
      }
      
      // Open Add Habit Modal
      const addBtn = target.closest('.btn-add-habit') as HTMLElement;
      if (addBtn) {
        const periodId = addBtn.dataset.periodId;
        if (periodId) this.openAddHabitModal(periodId);
        return;
      }
    });

    const openAddModalBtn = document.getElementById('btn-open-add-modal');
    const addModal = document.getElementById('add-habit-modal') as HTMLDialogElement;
    const closeModalBtn = document.getElementById('btn-close-modal');
    const cancelModalBtn = document.getElementById('btn-cancel-modal');
    const addHabitForm = document.getElementById('add-habit-form') as HTMLFormElement;
    const emojiChoices = document.querySelectorAll('.emoji-choice-btn');

    openAddModalBtn?.addEventListener('click', () => {
      this.openAddHabitModal();
    });

    closeModalBtn?.addEventListener('click', () => addModal?.close());
    cancelModalBtn?.addEventListener('click', () => addModal?.close());

    emojiChoices.forEach(btn => {
      btn.addEventListener('click', () => {
        emojiChoices.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.selectedEmoji = btn.getAttribute('data-emoji') || '📖';
      });
    });

    const prayerSelect = document.getElementById('habit-prayer-select') as HTMLSelectElement;
    prayerSelect?.addEventListener('change', () => {
      this.updateModalSuggestions(prayerSelect.value);
    });

    addHabitForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const titleInput = document.getElementById('habit-title-input') as HTMLInputElement;
      const prayerId = prayerSelect.value as any;

      if (titleInput && titleInput.value.trim()) {
        this.addHabit(prayerId, titleInput.value.trim(), this.selectedEmoji);
        titleInput.value = '';
        addModal?.close();
      }
    });

    const resetBtn = document.getElementById('btn-reset-defaults');
    resetBtn?.addEventListener('click', () => this.resetToDefaults());

    setInterval(() => {
      this.updateCurrentPrayerBadge();
    }, 60000);
  }

  public openAddHabitModal(preferredPrayerId?: string): void {
    const addModal = document.getElementById('add-habit-modal') as HTMLDialogElement;
    const prayerSelect = document.getElementById('habit-prayer-select') as HTMLSelectElement;
    const titleInput = document.getElementById('habit-title-input') as HTMLInputElement;

    if (prayerSelect) {
      if (preferredPrayerId) {
        prayerSelect.value = preferredPrayerId;
      } else {
        const current = this.getCurrentPrayerPeriod();
        prayerSelect.value = current.id;
      }
      this.updateModalSuggestions(prayerSelect.value);
    }

    if (titleInput) {
      titleInput.value = '';
    }

    addModal?.showModal();
  }

  private updateModalSuggestions(prayerId: string): void {
    const container = document.getElementById('modal-suggestions-container');
    if (!container) return;

    const period = PRAYER_PERIODS.find(p => p.id === prayerId);
    if (!period) return;

    container.innerHTML = '';
    period.suggestions.forEach(item => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'suggestion-chip';
      chip.textContent = `${item.emoji} ${item.title}`;
      chip.addEventListener('click', () => {
        const titleInput = document.getElementById('habit-title-input') as HTMLInputElement;
        if (titleInput) {
          titleInput.value = item.title;
        }
        this.selectedEmoji = item.emoji;
        
        document.querySelectorAll('.emoji-choice-btn').forEach(btn => {
          if (btn.getAttribute('data-emoji') === item.emoji) {
            btn.classList.add('selected');
          } else {
            btn.classList.remove('selected');
          }
        });
      });
      container.appendChild(chip);
    });
  }

  private render(): void {
    const completedList = this.completions[this.currentDate] || [];
    const totalHabits = this.habits.length;
    const totalCompleted = completedList.filter(id => this.habits.some(h => h.id === id)).length;
    const percent = totalHabits > 0 ? Math.round((totalCompleted / totalHabits) * 100) : 0;
    const streak = this.calculateStreak();

    const dateTextEl = document.getElementById('current-date-display');
    if (dateTextEl) {
      const isToday = this.currentDate === this.formatDate(new Date());
      dateTextEl.innerHTML = `${this.formatArabicDate(this.currentDate)} ${isToday ? '<span style="color:var(--primary); font-weight:bold;">(اليوم)</span>' : ''}`;
    }

    const streakEl = document.getElementById('streak-count-display');
    if (streakEl) {
      streakEl.textContent = `${streak} ${streak === 1 ? 'يوم' : 'أيام'} متتالية`;
    }

    const statPercentEl = document.getElementById('stat-percent');
    const statCompletedEl = document.getElementById('stat-completed');
    const statRemainingEl = document.getElementById('stat-remaining');

    if (statPercentEl) statPercentEl.textContent = `${percent}٪`;
    if (statCompletedEl) statCompletedEl.textContent = `${totalCompleted}`;
    if (statRemainingEl) statRemainingEl.textContent = `${Math.max(0, totalHabits - totalCompleted)}`;

    const ringBar = document.getElementById('stat-progress-ring-bar') as unknown as SVGCircleElement;
    const ringText = document.getElementById('stat-progress-ring-text');
    if (ringBar) {
      const radius = 24;
      const circumference = 2 * Math.PI * radius;
      ringBar.style.strokeDasharray = `${circumference} ${circumference}`;
      const offset = circumference - (percent / 100) * circumference;
      ringBar.style.strokeDashoffset = `${offset}`;
    }
    if (ringText) {
      ringText.textContent = `${percent}%`;
    }

    this.renderFilterTabs();
    this.renderPrayerSections();
  }

  private renderFilterTabs(): void {
    const container = document.getElementById('filter-tabs');
    if (!container) return;

    const completedList = this.completions[this.currentDate] || [];
    const totalDone = completedList.filter(id => this.habits.some(h => h.id === id)).length;

    let html = `
      <button type="button" class="filter-tab ${this.currentFilter === 'all' ? 'active' : ''}" data-filter="all">
        <span>🕌</span>
        <span>كل الفترات</span>
        <span class="badge">${totalDone}/${this.habits.length}</span>
      </button>
    `;

    PRAYER_PERIODS.forEach(period => {
      const periodHabits = this.habits.filter(h => h.prayerId === period.id);
      const periodDone = periodHabits.filter(h => completedList.includes(h.id)).length;
      const isActive = this.currentFilter === period.id;

      html += `
        <button type="button" class="filter-tab ${isActive ? 'active' : ''}" data-filter="${period.id}">
          <span>${period.icon}</span>
          <span>${period.name.replace('فترة ', '')}</span>
          <span class="badge">${periodDone}/${periodHabits.length}</span>
        </button>
      `;
    });

    container.innerHTML = html;
  }

  private renderPrayerSections(): void {
    const container = document.getElementById('prayer-sections-container');
    if (!container) return;

    const completedList = this.completions[this.currentDate] || [];
    const currentPrayer = this.getCurrentPrayerPeriod();

    const periodsToShow = this.currentFilter === 'all' 
      ? PRAYER_PERIODS 
      : PRAYER_PERIODS.filter(p => p.id === this.currentFilter);

    let html = '';

    periodsToShow.forEach(period => {
      const periodHabits = this.habits.filter(h => h.prayerId === period.id);
      const periodDoneCount = periodHabits.filter(h => completedList.includes(h.id)).length;
      const periodPercent = periodHabits.length > 0 ? Math.round((periodDoneCount / periodHabits.length) * 100) : 0;
      const isCurrent = period.id === currentPrayer.id;

      html += `
        <article class="prayer-card ${isCurrent ? 'is-current' : ''}" id="prayer-card-${period.id}">
          <header class="prayer-card-header">
            <div class="prayer-title-group">
              <div class="prayer-icon">${period.icon}</div>
              <div>
                <div class="prayer-name">
                  ${period.name}
                  ${isCurrent ? '<span class="current-indicator">الفترة الحالية الآن</span>' : ''}
                </div>
                <div class="prayer-time-range">${period.timeRange} • ${period.description}</div>
              </div>
            </div>

            <div class="prayer-header-actions">
              <div class="prayer-progress-summary">
                <span>${periodDoneCount} من ${periodHabits.length} مكتمل</span>
                <div class="prayer-progress-bar-bg">
                  <div class="prayer-progress-bar-fill" style="width: ${periodPercent}%"></div>
                </div>
              </div>

              <button type="button" class="btn btn-secondary btn-sm btn-add-habit" data-period-id="${period.id}">
                + إضافة عادة
              </button>
            </div>
          </header>

          <div class="habits-list">
      `;

      if (periodHabits.length === 0) {
        html += `
          <div class="empty-period">
            <p>لا توجد عادات مضافة لهذه الفترة بعد.</p>
            <button type="button" class="btn btn-primary btn-sm btn-add-habit" data-period-id="${period.id}">
              + أضف عادتك الأولى لـ ${period.name}
            </button>
          </div>
        `;
      } else {
        periodHabits.forEach(habit => {
          const isDone = completedList.includes(habit.id);
          html += `
            <div class="habit-item ${isDone ? 'is-completed' : ''}" id="habit-item-${habit.id}" data-habit-id="${habit.id}">
              <div class="habit-content-wrap">
                <div class="custom-checkbox">
                  <span class="checkmark-icon">✓</span>
                </div>
                <span class="habit-emoji">${habit.emoji}</span>
                <span class="habit-title">${habit.title}</span>
              </div>

              <div class="habit-actions">
                <button type="button" class="habit-btn-delete" title="حذف العادة">
                  ✕
                </button>
              </div>
            </div>
          `;
        });
      }

      html += `
          </div>
        </article>
      `;
    });

    container.innerHTML = html;
  }
}

declare global {
  interface Window {
    habitApp: HabitTrackerApp;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.habitApp = new HabitTrackerApp();
  });
} else {
  window.habitApp = new HabitTrackerApp();
}
