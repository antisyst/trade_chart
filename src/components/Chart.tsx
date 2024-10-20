import React, { useState, useCallback, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
import { exp, log } from 'mathjs';
import styles from '../styles/Chart.module.scss';
import { debounce } from 'lodash';

Chart.register(...registerables);

const BondingCurveChart: React.FC = () => {
  const initialPrice = 1;
  const k = 0.001;

  const chartRef = useRef<any>(null);

  const calculatePrice = (supply: number): number => initialPrice * exp(k * supply);
  const calculateSupply = (price: number): number => log(price / initialPrice) / k;

  const [currentSupply, setCurrentSupply] = useState(4000);
  const [tokenAmount, setTokenAmount] = useState(1000);
  const [newSupply, setNewSupply] = useState(currentSupply + tokenAmount);
  const [inputSupply, setInputSupply] = useState(currentSupply);
  const [inputPrice, setInputPrice] = useState(calculatePrice(currentSupply));

  const updateChartData = useCallback(
    debounce((supply: number, price: number) => {
      setInputSupply(supply);
      setInputPrice(price);
      setNewSupply(supply);
    }, 100),
    []
  );

  const handleChartClick = useCallback(
    (event: any, chart: any) => {
      const { offsetX } = event.native;
      const xScale = chart.scales.x;

      const nearestSupply = Math.round(xScale.getValueForPixel(offsetX));
      const clickedPrice = calculatePrice(nearestSupply);

      updateChartData(nearestSupply, clickedPrice);
    },
    [updateChartData]
  );

  const handleTokenAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const amount = parseInt(event.target.value, 10) || 0;
    setTokenAmount(amount);
    setNewSupply(currentSupply + amount);
  };

  const handleTokenSupplyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const supply = parseInt(event.target.value, 10) || 0;
    const price = calculatePrice(supply);
    updateChartData(supply, price);
  };

  const handleTokenPriceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const price = parseFloat(event.target.value) || 0;
    const supply = Math.round(calculateSupply(price));
    updateChartData(supply, price);
  };

  const generateChartData = useCallback(() => {
    const supplyData = Array.from({ length: 7001 }, (_, i) => i);
    const priceData = supplyData.map((supply) => calculatePrice(supply));
    const isMinting = newSupply > currentSupply;

    return {
      labels: supplyData,
      datasets: [
        {
          label: 'Bonding Curve',
          data: priceData,
          borderColor: '#5C94CE',
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
        },
        {
          label: 'Impact Area',
          data: priceData.map((price, idx) =>
            idx >= Math.min(currentSupply, newSupply) && idx <= Math.max(currentSupply, newSupply) ? price : null
          ),
          backgroundColor: isMinting ? 'rgba(22, 241, 149, 0.3)' : 'rgba(253, 105, 21, 0.3)',
          pointRadius: 0,
          fill: true,
        },
        {
          label: 'Current Supply',
          data: priceData.map((_, idx) => (idx === currentSupply ? calculatePrice(currentSupply) : null)),
          pointBackgroundColor: '#16F195',
          pointBorderColor: '#16F195',
          pointRadius: 6,
          borderWidth: 2,
        },
        {
          label: 'New Supply',
          data: priceData.map((_, idx) => (idx === newSupply ? calculatePrice(newSupply) : null)),
          pointBackgroundColor: '#FD6915',
          pointBorderColor: '#FD6915',
          pointRadius: 6,
          borderWidth: 2,
        },
      ],
    };
  }, [currentSupply, newSupply]);

  const options = {
    maintainAspectRatio: false,
    onClick: (event: any, elements: any, chart: any) => {
      handleChartClick(event, chart);
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Supply',
          color: '#FFFFFF',
          font: {
            size: 12,
            family: 'Montserrat, serif',
          },
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.2)',
          tickLength: 10,
          drawTicks: true,
          drawOnChartArea: true
        },
        ticks: {
          color: '#FFFFFF',
          font: {
            family: 'Montserrat, serif',
          },
          stepSize: 1000,
          callback: function (value: any) {
            return [0, 1000, 2000, 3000, 4000, 5000, 6000, 7000].includes(value) ? value : null;
          },
          autoSkip: false,
          padding: 5,
        },
        min: 0,
        max: 7200,
      },
      y: {
        title: {
          display: true,
          text: 'Price (USDC)',
          color: '#FFFFFF',
          font: {
            size: 12,
            family: 'Montserrat, serif',
          },
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.2)',
          drawBorder: true,
          borderDashOffset: 10,
          drawTicks: true,
          tickLength: 10,
        },
        ticks: {
          color: '#FFFFFF',
          font: {
            family: 'Montserrat, serif',
          },
          stepSize: 200,
          callback: function (value: any) {
            return [1, 200, 400, 600, 800, 1000, 1200, 1400].includes(value) ? value : null;
          },
          min: 0,
          max: 1400,
          crossAlign: 'center' as const,
          padding: 5,
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: false,
        bodyFont: {
          family: 'Montserrat, serif',
        },
      },
    },
    elements: {
      line: {
        tension: 0.4,
      },
    },
  };  

  return (
    <div className={styles.chartContainer}>
      <div className={styles.topContent}>
        <h2 className={styles.chartTitle}>Bonding Curve</h2>
        <div className={styles.buttonContainer}>
          <button className={styles.bondingCurveButton}>Bonding Curve</button>
          <button className={styles.currentSupplyButton}>Current Supply</button>
          <button className={styles.newSupplyButton}>New Supply</button>
          <button className={styles.impactAreaButton}>Impact Area</button>
        </div>
      </div>
      <div className={styles.chart}>
        <Line ref={chartRef} data={generateChartData()} options={options} />
      </div>
      <div className={styles.inputContainer}>
        <label className={styles.inputLabel}>
          Token Amount: 
          <input
            type="number"
            value={tokenAmount}
            onChange={handleTokenAmountChange}
            className={styles.inputField}
          />
        </label>
        <label className={styles.inputLabel}>
          Token Supply: 
          <input
            type="number"
            value={inputSupply}
            onChange={handleTokenSupplyChange}
            className={styles.inputField}
          />
        </label>
        <label className={styles.inputLabel}>
          Token Price (USDC): 
          <input
            type="number"
            step="0.01"
            value={inputPrice}
            onChange={handleTokenPriceChange}
            className={styles.inputField}
          />
        </label>
      </div>
    </div>
  );
};

export default BondingCurveChart;
