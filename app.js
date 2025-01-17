const express = require('express');
const swaggerUi = require('swagger-ui-express');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());

// Swagger JSON 파일 로드
const swaggerDocument = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'swagger.json'), 'utf8')
);

// Swagger UI 설정
const options = {
    customCss: '.swagger-ui .topbar { display: none }', // 상단 Swagger 로고 숨기기 (선택사항)
    customSiteTitle: "프린터 & 디바이스 제어 API 문서"
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, options));

app.get('/', (req, res) => {
    res.redirect('/api-docs/#');
});

// 실제 API 엔드포인트 구현은 여기에...
app.post('/api/print', (req, res) => {
    // 프린터 API 구현
});

app.post('/device/:deviceUuid/action/:actionName/run/:runId/state', async (req, res) => {
    try {
        // URL 파라미터 추출
        const { deviceUuid, actionName, runId } = req.params;

        // 요청 바디 추출
        const { state, result } = req.body;

        // 유효성 검사
        if (!state) {
            return res.status(400).json({
                success: false,
                message: 'state는 필수 입력값입니다.'
            });
        }

        // Queue0로 전송할 데이터
        const queue0Data = {
            data: {
                status: state,
                error: null,
                additionalProp1: {}
            },
            timestamp: Math.floor(Date.now())
        };

        try {
            console.log('Sending to Queue0:', queue0Data);
            
            // Queue0 API로 데이터 전송
            const queue0Response = await axios.post(
                `https://www.queue0.com/api/platform/v1/device/${deviceUuid}/action/${actionName}/run/${runId}/state`,
                queue0Data,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    timeout: 5000
                }
            );

            // 로그 출력
            console.log('Device State Update:', {
                deviceUuid,
                actionName,
                runId,
                state,
                result,
                queue0Response: queue0Response.data
            });

            // 응답
            res.status(200).json({
                success: true,
                message: 'Device state updated and forwarded to Queue0 successfully',
                data: {
                    deviceUuid,
                    actionName,
                    runId,
                    state,
                    result,
                    timestamp: new Date().toISOString(),
                    queue0Response: queue0Response.data
                }
            });

        } catch (apiError) {
            console.error('Queue0 API Error:', {
                message: apiError.message,
                response: apiError.response?.data,
                status: apiError.response?.status
            });

            res.status(502).json({
                success: false,
                message: 'Queue0 API 전송 실패',
                error: {
                    message: apiError.message,
                    response: apiError.response?.data,
                    status: apiError.response?.status
                }
            });
        }

    } catch (error) {
        console.error('Device state 업데이트 중 에러 발생:', error);
        res.status(500).json({
            success: false,
            message: '서버 에러가 발생했습니다.',
            error: error.message
        });
    }
});

app.post('/device/:deviceUuid/status', async (req, res) => {
    try {
        const { deviceUuid } = req.params;
        const { data } = req.body;

        // 입력 데이터 로깅
        console.log('Received request:', {
            deviceUuid,
            body: req.body
        });

        if (!data || !data.outlet) {
            return res.status(400).json({
                success: false,
                message: 'data.outlet은 필수 입력값입니다.'
            });
        }

        // Queue0로 전송할 데이터
        const queue0Data = {
            data: {
                status: data.status || 'ready',
                outlet: data.outlet
            },
            timestamp: Math.floor(Date.now())
        };

        console.log('Sending to Queue0:', queue0Data);

        try {
            const queue0Response = await axios.post(
                `https://www.queue0.com/api/platform/v1/device/${deviceUuid}/state`,
                queue0Data,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    // 타임아웃 설정
                    timeout: 5000
                }
            );

            console.log('Queue0 Response:', queue0Response.data);

            res.status(200).json({
                success: true,
                message: 'Data forwarded successfully',
                originalData: data,
                queue0Response: queue0Response.data
            });

        } catch (apiError) {
            console.error('Queue0 API Error:', {
                message: apiError.message,
                response: apiError.response?.data,
                status: apiError.response?.status
            });

            res.status(502).json({
                success: false,
                message: 'Queue0 API 전송 실패',
                error: {
                    message: apiError.message,
                    response: apiError.response?.data,
                    status: apiError.response?.status
                }
            });
        }

    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).json({
            success: false,
            message: '서버 에러가 발생했습니다.',
            error: error.message
        });
    }
});


const port = 3000;
app.listen(port, () => {
    console.log(`서버가 http://localhost:${port} 에서 실행 중입니다.`);
    console.log(`API 문서: http://localhost:${port}/api-docs`);
});