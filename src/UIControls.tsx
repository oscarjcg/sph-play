import { Button, TextField, Typography, Stack, Checkbox } from '@mui/material';

export function UIControls({
    fps,
    tempControls,
    setTempControls,
    tempVColor,
    setTempVColor,
    isPaused,
    setIsPaused,
    onReset,
    tempN,
    setTempN,
    tempH,
    setTempH,
    tempDT,
    setTempDT,
    tempGRAV,
    setTempGRAV,
    tempScale,
    setTempScale,
    tempBoxX,
    setTempBoxX,
    tempBoxY,
    setTempBoxY,
    tempBoxZ,
    setTempBoxZ,
    tempBoundarySpacing,
    setTempBoundarySpacing
}: {
    fps: number;
    tempControls: boolean;
    setTempControls: (v: boolean) => void;
    tempVColor: boolean;
    setTempVColor: (v: boolean) => void;
    isPaused: boolean;
    setIsPaused: (v: boolean) => void;
    onReset: () => void;
    tempN: string;
    setTempN: (v: string) => void;
    tempH: string;
    setTempH: (v: string) => void;
    tempDT: string;
    setTempDT: (v: string) => void;
    tempGRAV: string;
    setTempGRAV: (v: string) => void;
    tempScale: string;
    setTempScale: (v: string) => void;
    tempBoxX: string;
    setTempBoxX: (v: string) => void;
    tempBoxY: string;
    setTempBoxY: (v: string) => void;
    tempBoxZ: string;
    setTempBoxZ: (v: string) => void;
    tempBoundarySpacing: string;
    setTempBoundarySpacing: (v: string) => void;
}) {
    return (
        <>
            <Typography
                sx={{ position: 'absolute', zIndex: 10, top: '10px', right: '10px', color: 'text.primary' }}
            >
                FPS: {fps}
            </Typography>

            <Stack direction="column" spacing={2} sx={{ position: 'absolute', zIndex: 10, top: '50px', left: '10px' }}>
                <Stack direction="row" spacing={2} alignItems="center">
                    <Typography
                        sx={{ color: 'text.primary' }}
                    >
                        UI:
                    </Typography>
                    <Checkbox
                        checked={tempControls}
                        onChange={(e) => setTempControls(e.target.checked)}
                        color="primary"
                    />
                </Stack>

                <Stack direction="column" spacing={2} sx={{ display: tempControls ? 'flex' : 'none' }}>
                    {/* Buttons */}
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Button
                            variant="contained"
                            color="primary"
                            sx={{ zIndex: 10 }}
                            onClick={() => setIsPaused(!isPaused)}
                        >
                            {isPaused ? 'Resume' : 'Pause'}
                        </Button>
                        <Button
                            variant="contained"
                            color="secondary"
                            sx={{ zIndex: 10 }}
                            onClick={onReset}
                        >
                            Reset
                        </Button>
                    </Stack>

                    <Stack direction="row" spacing={2} alignItems="center">
                        <Typography
                            sx={{ color: 'text.primary' }}
                        >
                            V Color:
                        </Typography>
                        <Checkbox
                            checked={tempVColor}
                            onChange={(e) => setTempVColor(e.target.checked)}
                            color="primary"
                        />
                    </Stack>

                    {/* N Particules */}
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Typography
                            sx={{ color: 'text.primary' }}
                        >
                            N:
                        </Typography>
                        <TextField
                            type="number"
                            value={tempN}
                            onChange={(e) => setTempN(e.target.value)}
                            variant="outlined"
                            size="small"
                            sx={{ color: 'text.primary' }}
                        />
                    </Stack>

                    <Stack direction="row" spacing={2} alignItems="center">
                        <Typography
                            sx={{ color: 'text.primary' }}
                        >
                            H:
                        </Typography>
                        <TextField
                            type="number"
                            value={tempH}
                            onChange={(e) => setTempH(e.target.value)}
                            variant="outlined"
                            size="small"
                            sx={{ color: 'text.primary' }}
                        />
                    </Stack>

                    <Stack direction="row" spacing={2} alignItems="center">
                        <Typography
                            sx={{ color: 'text.primary' }}
                        >
                            DT:
                        </Typography>
                        <TextField
                            type="number"
                            value={tempDT}
                            onChange={(e) => setTempDT(e.target.value)}
                            variant="outlined"
                            size="small"
                            sx={{ color: 'text.primary' }}
                        />
                    </Stack>

                    <Stack direction="row" spacing={2} alignItems="center">
                        <Typography
                            sx={{ color: 'text.primary' }}
                        >
                            G:
                        </Typography>
                        <TextField
                            type="number"
                            value={tempGRAV}
                            onChange={(e) => setTempGRAV(e.target.value)}
                            variant="outlined"
                            size="small"
                            sx={{ color: 'text.primary' }}
                        />
                    </Stack>

                    <Stack direction="row" spacing={2} alignItems="center">
                        <Typography
                            sx={{ color: 'text.primary' }}
                        >
                            Scale:
                        </Typography>
                        <TextField
                            type="number"
                            value={tempScale}
                            onChange={(e) => setTempScale(e.target.value)}
                            variant="outlined"
                            size="small"
                            sx={{ color: 'text.primary' }}
                        />
                    </Stack>

                    {/* Box */}
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Typography
                            sx={{ color: 'text.primary' }}
                        >
                            Box X:
                        </Typography>
                        <TextField
                            type="number"
                            value={tempBoxX}
                            onChange={(e) => setTempBoxX(e.target.value)}
                            variant="outlined"
                            size="small"
                            sx={{ color: 'text.primary' }}
                        />
                    </Stack>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Typography
                            sx={{ color: 'text.primary' }}
                        >
                            Box Y:
                        </Typography>
                        <TextField
                            type="number"
                            value={tempBoxY}
                            onChange={(e) => setTempBoxY(e.target.value)}
                            variant="outlined"
                            size="small"
                            sx={{ color: 'text.primary' }}
                        />

                    </Stack>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Typography
                            sx={{ color: 'text.primary' }}
                        >
                            Box Z:
                        </Typography>
                        <TextField
                            type="number"
                            value={tempBoxZ}
                            onChange={(e) => setTempBoxZ(e.target.value)}
                            variant="outlined"
                            size="small"
                            sx={{ color: 'text.primary' }}
                        />

                    </Stack>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Typography
                            sx={{ color: 'text.primary' }}
                        >
                            Boundary spacing:
                        </Typography>
                        <TextField
                            type="number"
                            value={tempBoundarySpacing}
                            onChange={(e) => setTempBoundarySpacing(e.target.value)}
                            variant="outlined"
                            size="small"
                            sx={{ color: 'text.primary' }}
                        />

                    </Stack>
                </Stack>
            </Stack>
        </>
    );
}