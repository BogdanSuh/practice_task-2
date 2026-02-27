Vue.component('Card', {
    template: `
    <div class="card">
        <h3>{{ card.content }}</h3>
        <ul>
            <li v-for="(item, index) in card.items" :key="index">
                <input 
                    type="checkbox" 
                    v-model="item.completed" 
                    :disabled="card.isLocked || item.completed" 
                    @change="handleCheckboxChange(item)"
                    @change="updateCompletion()" 
                />
                <span :class="{ completed: item.completed }">{{ item.text }}</span>
            </li>
        </ul>
        <div v-if="card.completedDate" style="font-size: 0.8em; color: #888; margin-top: 5px;">
            Завершено: {{ card.completedDate }}
        </div>
    </div>
    `,
    props: {
        card: Object,
    },
    methods: {
        handleCheckboxChange(item) {
            item.completed = true;
        },
        updateCompletion() {
            this.$emit('update-completion', this.card.id);
        },
        markAsDone() {
            this.$emit('mark-as-done', this.card.id);
        },
    }
});

Vue.component('column', {
    template: `
    <div class="column">
        <div v-for="card in cards" :key="card.id">
          <Card :card="card" @move="handleMove(card.id)"
                @update-completion="handleUpdateCompletion(card.id)"
                @mark-as-done="handleMarkAsDone(card.id)" />
        </div>
        <div v-if="cards.length === 0" style="text-align: center; color: #aaa; padding: 20px;">
            Пусто
        </div>
    </div>
    `,
    props: {
        cards: Array,
        columnIndex: Number,
    },
    methods: {
        handleMove(cardId) {
            this.$emit('move-card', { cardId, fromColumnIndex: this.columnIndex });
        },
        handleUpdateCompletion(cardId) {
            this.$emit('update-completion', cardId);
        },
        handleMarkAsDone(cardId) {
            this.$emit('mark-as-done', cardId);
        },
    },
});

Vue.component('notepad', {
    template: `
        <div>
            <!-- Поле поиска -->
            <div class="search-container">
                <input 
                    type="text" 
                    v-model="searchQuery" 
                    class="search-input" 
                    placeholder="Поиск по названию карточки..." 
                />
            </div>

            <div class="notepad">
                <!-- Используем filteredColumns вместо columns -->
                <column
                    v-for="(column, index) in filteredColumns"
                    :key="index"
                    :cards="column.cards"
                    :columnIndex="index"
                    @move-card="moveCard"
                    @update-completion="handleUpdateCompletion"
                    @mark-as-done="handleMarkAsDone"
                 />
                 
                <div class="card-creator">
                    <h3>Создать карточку</h3>
                    <textarea v-model="newCardContent" placeholder="Введите заголовок карточки"></textarea>
                    <ul>
                        <li v-for="(item, index) in newCardItems" :key="index">
                            <input v-model="item.text" placeholder="Пункт списка" :disabled="isCardLocked" />
                            <button @click="removeItem(index)" :disabled="isCardLocked" style="background-color: #ff5252; min-width: auto; padding: 8px 12px;">×</button>
                        </li>
                    </ul>
                    <button @click="addItem" :disabled="isCardLocked || newCardItems.length >= 5">+ Добавить пункт</button>
                    <button @click="addCard" :disabled="isAddCardDisabled" style="margin-top: 15px; font-size: 1.1em;">Создать карточку</button>
                    <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            searchQuery: '', // Переменная для поиска
            columns: [
                { cards: [], maxCards: 3 },
                { cards: [], maxCards: 5 },
                { cards: [], maxCards: 9999 },
            ],
            newCardContent: '',
            newCardItems: [],
            isCardLocked: false,
            errorMessage: '',
        };
    },
    computed: {
        isAddCardDisabled() {
            return (
                this.columns[0].cards.length >= this.columns[0].maxCards ||
                this.newCardItems.length < 3 ||
                this.newCardItems.length > 5 ||
                !this.newCardContent.trim()
            );
        },
        filteredColumns() {
            if (!this.searchQuery.trim()) {
                return this.columns;
            }

            const query = this.searchQuery.toLowerCase();

            return this.columns.map(col => {
                return {
                    ...col,
                    cards: col.cards.filter(card =>
                        card.content.toLowerCase().includes(query)
                    )
                };
            });
        }
    },
    methods: {
        addItem() {
            if (this.newCardItems.length < 5) {
                this.newCardItems.push({ text: '', completed: false });
                this.errorMessage = '';
            } else {
                this.errorMessage = 'Максимальное количество пунктов — 5.';
            }
        },
        removeItem(index) {
            this.newCardItems.splice(index, 1);
            this.errorMessage = '';
        },
        addCard() {
            if (this.newCardItems.length < 3 || this.newCardItems.length > 5) {
                this.errorMessage = 'Количество пунктов должно быть от 3 до 5.';
                return;
            }

            if (!this.newCardContent.trim()) {
                this.errorMessage = 'Заголовок карточки не может быть пустым.';
                return;
            }

            if (this.columns[0].cards.length < this.columns[0].maxCards) {
                const newCard = {
                    id: Date.now(),
                    content: this.newCardContent,
                    items: this.newCardItems.map(item => ({ ...item })),
                    completedDate: null,
                    isDone: false,
                };
                this.columns[0].cards.push(newCard);
                this.resetCardCreator();
                this.saveData();
            } else {
                this.errorMessage = 'Первый столбец переполнен.';
            }
        },
        resetCardCreator() {
            this.newCardContent = '';
            this.newCardItems = [];
            this.isCardLocked = false;
            this.errorMessage = '';
        },
        moveCard({ cardId, fromColumnIndex }) {
            const card = this.columns[fromColumnIndex].cards.find(c => c.id === cardId);
            if (card) {
                this.columns[fromColumnIndex].cards = this.columns[fromColumnIndex].cards.filter(c => c.id !== cardId);

                if (fromColumnIndex + 1 < this.columns.length) {
                    const nextColumn = this.columns[fromColumnIndex + 1];
                    if (nextColumn.cards.length < nextColumn.maxCards) {
                        nextColumn.cards.push(card);
                    } else {
                        alert(`Столбец ${fromColumnIndex + 2} переполнен!`);
                        this.columns[fromColumnIndex].cards.push(card);
                    }
                }
                this.saveData();
            }
        },
        handleUpdateCompletion(cardId) {
            const card = this.columns.flatMap(col => col.cards).find(c => c.id === cardId);
            if (card) {
                const completedCount = card.items.filter(item => item.completed).length;
                const totalCount = card.items.length;

                if (totalCount > 0) {
                    const completionPercentage = (completedCount / totalCount) * 100;

                    if (completionPercentage >= 50 && this.columns[0].cards.includes(card)) {
                        this.moveCard({ cardId, fromColumnIndex: 0 });
                    } else if (completionPercentage === 100 && this.columns[1].cards.includes(card)) {
                        this.moveCard({ cardId, fromColumnIndex: 1 });
                        card.completedDate = new Date().toLocaleString();
                    }
                }
                this.saveData();
            }
        },
        handleMarkAsDone(cardId) {
            const card = this.columns.flatMap(col => col.cards).find(c => c.id === cardId);
            if (card) {
                card.isDone = true;
                this.handleUpdateCompletion(cardId);
                this.saveData();
            }
        },
        saveData() {
            localStorage.setItem('notepadData', JSON.stringify(this.columns));
        },
        loadData() {
            const savedData = localStorage.getItem('notepadData');
            if (savedData) {
                this.columns = JSON.parse(savedData);
            }
        },
    },
    mounted() {
        this.loadData();
    },
});

let app = new Vue({
    el: '#app',
});