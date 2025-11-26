import React, { useState } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format, subYears, startOfDay } from 'date-fns';

const BacktestForm = ({ onSubmit, isLoading }) => {
  // Calculate default dates
  const today = startOfDay(new Date()); // Use startOfDay to avoid time part issues
  const oneYearAgo = startOfDay(subYears(today, 1));

  const [assets, setAssets] = useState([{ ticker: '', weight: '' }]);
  const [initialInvestment, setInitialInvestment] = useState('10000');
  const [startDate, setStartDate] = useState(oneYearAgo); // Default to one year ago
  const [endDate, setEndDate] = useState(today);     // Default to today
  const [benchmarkTicker, setBenchmarkTicker] = useState('SPY');
  const [rebalance, setRebalance] = useState('None'); // None, Monthly, Quarterly, Year
  const [errors, setErrors] = useState({});

  const handleAssetChange = (index, event) => {
    const newAssets = [...assets];
    newAssets[index][event.target.name] = event.target.value;
    setAssets(newAssets);
  };

  const handleAddAsset = () => {
    setAssets([...assets, { ticker: '', weight: '' }]);
  };

  const handleRemoveAsset = (index) => {
    const newAssets = [...assets];
    newAssets.splice(index, 1);
    setAssets(newAssets);
  };

  const validateForm = () => {
    const newErrors = {};
    let isValid = true;

    // Validate assets (tickers and weights)
    let totalWeight = 0;
    assets.forEach((asset, index) => {
      if (!asset.ticker.trim()) {
        newErrors[`asset_ticker_${index}`] = 'Stock symbol cannot be empty';
        isValid = false;
      }
      if (!asset.weight.trim()) {
        newErrors[`asset_weight_${index}`] = 'Weight cannot be empty';
        isValid = false;
      } else {
        const weightValue = parseFloat(asset.weight);
        if (isNaN(weightValue) || weightValue <= 0 || weightValue > 1) {
          newErrors[`asset_weight_${index}`] = 'Weight must be between 1% and 100%';
          isValid = false;
        } else {
          totalWeight += weightValue;
        }
      }
    });

    if (assets.length > 0 && Math.abs(totalWeight - 1.0) > 0.0001) {
      newErrors.totalWeight = 'Sum of all weights must equal 100%';
      isValid = false;
    }
    
    if (assets.length === 0) {
        newErrors.assets = 'Please add at least one asset';
        isValid = false;
    }

    // Validate initial investment
    if (!initialInvestment.trim()) {
      newErrors.initialInvestment = 'Initial investment amount cannot be empty';
      isValid = false;
    } else if (isNaN(parseFloat(initialInvestment)) || parseFloat(initialInvestment) <= 0) {
      newErrors.initialInvestment = 'Initial investment must be a positive number';
      isValid = false;
    }

    // Validate dates
    if (!startDate) {
      newErrors.startDate = 'Start date cannot be empty';
      isValid = false;
    }
    if (!endDate) {
      newErrors.endDate = 'End date cannot be empty';
      isValid = false;
    }
    if (startDate && endDate && startDate >= endDate) {
      newErrors.dateRange = 'End date must be later than start date';
      isValid = false;
    }
    
    // Benchmark ticker is optional, no validation needed unless it's entered and needs specific format (not for now)

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (validateForm()) {
      const formattedStartDate = startDate ? format(startDate, 'yyyy-MM-dd') : null;
      const formattedEndDate = endDate ? format(endDate, 'yyyy-MM-dd') : null;

      const formData = {
        assets: assets.map(a => ({ ticker: a.ticker.toUpperCase(), weight: parseFloat(a.weight) })),
        initial_investment: parseFloat(initialInvestment),
        start_date: formattedStartDate,
        end_date: formattedEndDate,
        benchmark_ticker: benchmarkTicker.trim() ? benchmarkTicker.trim().toUpperCase() : null,
        rebalance: rebalance === 'None' ? null : rebalance
      };
      onSubmit(formData);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
      {assets.map((asset, index) => (
        <Grid container spacing={1} key={index} alignItems="center" sx={{ mb: 1 }}>
          <Grid item xs={6}>
            <TextField
              label={`Stock #${index + 1}`}
              name="ticker"
              value={asset.ticker}
              onChange={(e) => handleAssetChange(index, e)}
              fullWidth
              size="small"
              error={!!errors[`asset_ticker_${index}`]}
              helperText={errors[`asset_ticker_${index}`]}
              disabled={isLoading}
            />
          </Grid>
          <Grid item xs={4}>
            <TextField
              label="Weight"
              name="weight"
              value={asset.weight ? (parseFloat(asset.weight) * 100).toString() : ""}
              onChange={(e) => {
                const value = e.target.value;
                const event = {
                  target: {
                    name: 'weight',
                    value: value ? (parseFloat(value) / 100).toString() : ""
                  }
                };
                handleAssetChange(index, event);
              }}
              fullWidth
              size="small"
              InputProps={{
                endAdornment: <span style={{ marginLeft: 4 }}>%</span>,
                inputProps: { 
                  style: { textAlign: 'left' }
                }
              }}
              inputProps={{ 
                step: "1",
                min: "0",
                max: "100"
              }}
              error={!!errors[`asset_weight_${index}`]}
              helperText={errors[`asset_weight_${index}`]}
              disabled={isLoading}
            />
          </Grid>
          <Grid item xs={2} container justifyContent="flex-end">
            {assets.length > 1 && (
              <IconButton onClick={() => handleRemoveAsset(index)} color="error" disabled={isLoading} size="small">
                <RemoveCircleOutlineIcon />
              </IconButton>
            )}
            {index === assets.length - 1 && (
              <IconButton onClick={handleAddAsset} color="primary" disabled={isLoading} size="small">
                <AddCircleOutlineIcon />
              </IconButton>
            )}
          </Grid>
        </Grid>
      ))}
      {errors.totalWeight && <Typography color="error" variant="caption" display="block" gutterBottom>{errors.totalWeight}</Typography>}
      {errors.assets && <Typography color="error" variant="caption" display="block" gutterBottom>{errors.assets}</Typography>}

      <TextField
        select
        label="Rebalance"
        value={rebalance}
        onChange={(e) => setRebalance(e.target.value)}
        fullWidth
        margin="normal"
        size="small"
        disabled={isLoading}
        SelectProps={{
          native: true,
        }}
      >
        <option value="None">None</option>
        <option value="Monthly">Monthly</option>
        <option value="Quarterly">Quarterly</option>
        <option value="Annually">Year</option>
      </TextField>

      <TextField
        label="Initial Investment"
        type="number"
        value={initialInvestment}
        onChange={(e) => setInitialInvestment(e.target.value)}
        fullWidth
        margin="normal"
        size="small"
        error={!!errors.initialInvestment}
        helperText={errors.initialInvestment}
        disabled={isLoading}
      />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, my: 2 }}>
        <DatePicker
          label="Start Date"
          value={startDate}
          onChange={(newValue) => setStartDate(newValue)}
          slotProps={{
            textField: {
              fullWidth: true,
              size: 'small',
              error: !!errors.startDate || !!errors.dateRange,
              helperText: errors.startDate || errors.dateRange,
              disabled: isLoading
            }
          }}
        />
        <DatePicker
          label="End Date"
          value={endDate}
          onChange={(newValue) => setEndDate(newValue)}
          slotProps={{
            textField: {
              fullWidth: true,
              size: 'small',
              error: !!errors.endDate || !!errors.dateRange,
              helperText: errors.endDate,
              disabled: isLoading
            }
          }}
        />
      </Box>
      {errors.dateRange && !errors.startDate && !errors.endDate && <Typography color="error" variant="caption" display="block" sx={{mt: -1, mb:1}}>{errors.dateRange}</Typography>} 

      <TextField
        label="Benchmark Symbol"
        value={benchmarkTicker}
        onChange={(e) => setBenchmarkTicker(e.target.value)}
        fullWidth
        margin="normal"
        size="small"
        placeholder="e.g., SPY, QQQ"
        disabled={isLoading}
      />

      <Button
        type="submit"
        variant="contained"
        color="primary"
        fullWidth
        disabled={isLoading}
        sx={{ mt: 2, mb: 2 }}
      >
        {isLoading ? 'Running...' : 'Start Backtest'}
      </Button>
    </Box>
  );
};

export default BacktestForm; 