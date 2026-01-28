import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Dimensions,
    SafeAreaView,
    StatusBar,
    Modal,
    FlatList,
    TouchableOpacity
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const GAP = 14;
const BUTTON_SIZE = (width - (GAP * 5)) / 4;
const STORAGE_KEY = '@calculator_history_v1';

export default function IOSCalculatorWithHistory({ onUnlock }) {
    const [display, setDisplay] = useState('0');
    const [expression, setExpression] = useState('');
    const [shouldReset, setShouldReset] = useState(false);

    // History State
    const [history, setHistory] = useState([]);
    const [historyVisible, setHistoryVisible] = useState(false);

    // 1. Load History from Cache on App Start
    useEffect(() => {
        const loadHistory = async () => {
            try {
                const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
                if (jsonValue != null) {
                    setHistory(JSON.parse(jsonValue));
                }
            } catch (e) {
                console.error("Failed to load history");
            }
        };
        loadHistory();
    }, []);

    // 2. Save History to Cache
    const saveToHistory = async (expr, res) => {
        const newItem = {
            id: Date.now().toString(), // Unique ID
            expression: expr,
            result: res
        };

        const updatedHistory = [newItem, ...history]; // Add to top

        // Limit history to last 50 items to save memory
        if (updatedHistory.length > 50) updatedHistory.pop();

        setHistory(updatedHistory);

        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
        } catch (e) {
            console.error("Failed to save history");
        }
    };

    const clearHistory = async () => {
        setHistory([]);
        try {
            await AsyncStorage.removeItem(STORAGE_KEY);
        } catch (e) { }
    };

    const handleNumber = (num) => {
        const nextVal = (display === '0' || shouldReset) ? num : display + num;

        if (nextVal === '1234') {
            onUnlock();
            return;
        }

        if (shouldReset) {
            setDisplay(num);
            setShouldReset(false);
        } else {
            setDisplay(display === '0' ? num : display + num);
        }
    };

    const handleOperator = (op) => {
        setExpression(display + op);
        setShouldReset(true);
    };

    const handleClear = () => {
        setDisplay('0');
        setExpression('');
    };

    const handleEquals = () => {
        if (!expression) return;
        try {
            const sanitized = (expression + display)
                .replace(/×/g, '*')
                .replace(/÷/g, '/')
                .replace(/−/g, '-');

            // eslint-disable-next-line no-eval
            const result = eval(sanitized);
            const resultStr = String(result);

            // SAVE TO HISTORY
            saveToHistory(expression + ' ' + display, resultStr);

            setExpression('');
            setDisplay(resultStr);
            setShouldReset(true);
        } catch (e) {
            setDisplay('Error');
        }
    };

    const getFormattedDisplay = () => {
        if (display === 'Error') return 'Error';
        const [integer, decimal] = display.split('.');
        const formattedInt = Number(integer).toLocaleString('en-US');
        return decimal !== undefined ? `${formattedInt}.${decimal}` : formattedInt;
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000000" />

            {/* Top Bar with History Toggle */}
            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => setHistoryVisible(true)} style={styles.historyBtn}>
                    <Text style={styles.historyIcon}>🕒</Text>
                </TouchableOpacity>
            </View>

            {/* Main Display */}
            <View style={styles.displayArea}>
                <Text style={styles.resultText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
                    {getFormattedDisplay()}
                </Text>
            </View>

            {/* Button Grid */}
            <View style={styles.grid}>
                <Row>
                    <Btn label={display === '0' ? 'AC' : 'C'} type="gray" onPress={handleClear} />
                    <Btn label="+/-" type="gray" />
                    <Btn label="%" type="gray" />
                    <Btn label="÷" type="orange" onPress={() => handleOperator('÷')} />
                </Row>
                <Row>
                    <Btn label="7" onPress={() => handleNumber('7')} />
                    <Btn label="8" onPress={() => handleNumber('8')} />
                    <Btn label="9" onPress={() => handleNumber('9')} />
                    <Btn label="×" type="orange" onPress={() => handleOperator('×')} />
                </Row>
                <Row>
                    <Btn label="4" onPress={() => handleNumber('4')} />
                    <Btn label="5" onPress={() => handleNumber('5')} />
                    <Btn label="6" onPress={() => handleNumber('6')} />
                    <Btn label="−" type="orange" onPress={() => handleOperator('−')} />
                </Row>
                <Row>
                    <Btn label="1" onPress={() => handleNumber('1')} />
                    <Btn label="2" onPress={() => handleNumber('2')} />
                    <Btn label="3" onPress={() => handleNumber('3')} />
                    <Btn label="+" type="orange" onPress={() => handleOperator('+')} />
                </Row>
                <Row>
                    <Btn label="0" type="zero" onPress={() => handleNumber('0')} />
                    <Btn label="." onPress={() => handleNumber('.')} />
                    <Btn label="=" type="orange" onPress={handleEquals} />
                </Row>
            </View>

            {/* HISTORY MODAL */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={historyVisible}
                onRequestClose={() => setHistoryVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={clearHistory}>
                            <Text style={styles.modalActionText}>Clear</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>History</Text>
                        <TouchableOpacity onPress={() => setHistoryVisible(false)}>
                            <Text style={[styles.modalActionText, { fontWeight: 'bold' }]}>Done</Text>
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={history}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContent}
                        renderItem={({ item }) => (
                            <View style={styles.historyItem}>
                                <Text style={styles.historyExpr}>{item.expression} =</Text>
                                <Text style={styles.historyResult}>{item.result}</Text>
                            </View>
                        )}
                        ListEmptyComponent={
                            <Text style={styles.emptyText}>No history yet</Text>
                        }
                    />
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const Row = ({ children }) => <View style={styles.row}>{children}</View>;

const Btn = ({ label, type = 'dark', onPress }) => {
    const getStyles = () => {
        switch (type) {
            case 'gray': return { bg: '#a5a5a5', text: '#000000', width: BUTTON_SIZE, align: 'center', padding: 0 };
            case 'orange': return { bg: '#ff9f0a', text: '#ffffff', width: BUTTON_SIZE, align: 'center', padding: 0 };
            case 'zero': return { bg: '#333333', text: '#ffffff', width: (BUTTON_SIZE * 2) + GAP, align: 'flex-start', padding: 30 };
            default: return { bg: '#333333', text: '#ffffff', width: BUTTON_SIZE, align: 'center', padding: 0 };
        }
    };
    const styleConfig = getStyles();
    return (
        <Pressable onPress={onPress} style={({ pressed }) => [styles.baseBtn, { backgroundColor: styleConfig.bg, width: styleConfig.width, alignItems: styleConfig.align, paddingLeft: styleConfig.padding }, pressed && styles.pressed]}>
            <Text style={[styles.btnText, { color: styleConfig.text }]}>{label}</Text>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000', justifyContent: 'flex-end' },

    // Top Bar
    topBar: { position: 'absolute', top: 50, left: 20, zIndex: 10 },
    historyBtn: { padding: 10 },
    historyIcon: { fontSize: 24, opacity: 0.7 },

    // Display
    displayArea: { paddingHorizontal: 20, paddingBottom: 20, alignItems: 'flex-end', justifyContent: 'flex-end', flex: 1 },
    resultText: { color: '#ffffff', fontSize: 90, fontWeight: '200', textAlign: 'right' },

    // Grid
    grid: { paddingHorizontal: GAP, paddingBottom: 40 },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: GAP },
    baseBtn: { height: BUTTON_SIZE, borderRadius: BUTTON_SIZE / 2, justifyContent: 'center' },
    btnText: { fontSize: 36, fontWeight: '500' },
    pressed: { opacity: 0.7 },

    // Modal Styles
    modalContainer: { flex: 1, backgroundColor: '#1c1c1e', marginTop: 50, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#333' },
    modalTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
    modalActionText: { color: '#ff9f0a', fontSize: 17 },
    listContent: { padding: 20 },
    historyItem: { marginBottom: 25, alignItems: 'flex-end' },
    historyExpr: { color: '#888', fontSize: 18, marginBottom: 5 },
    historyResult: { color: '#ff9f0a', fontSize: 30, fontWeight: '500' },
    emptyText: { color: '#666', textAlign: 'center', marginTop: 50, fontSize: 18 }
});