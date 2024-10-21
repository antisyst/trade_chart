import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { exp, log } from 'mathjs';
import styles from '../styles/Chart.module.scss';

const BondingCurveChart: React.FC = () => {
  const initialPrice = 1;
  const k = 0.001;

  const calculatePrice = (supply: number): number => initialPrice * exp(k * supply);
  const calculateSupply = (price: number): number => log(price / initialPrice) / k;
  const calculateTotalFunds = (supply: number): number => (initialPrice / k) * (exp(k * supply) - 1);

  const initialTokenAmount = 1000;
  const initialTokenSupply = 4000;
  const initialTokenPrice = calculatePrice(initialTokenSupply);

  const chartRef = useRef<SVGSVGElement | null>(null);
  const [chartWidth, setChartWidth] = useState<number>(700); 
  const [currentSupply, setCurrentSupply] = useState(initialTokenSupply);
  const [tokenAmount, setTokenAmount] = useState(initialTokenAmount);
  const [newSupply, setNewSupply] = useState(currentSupply + tokenAmount);
  const [inputSupply, setInputSupply] = useState(currentSupply);
  const [inputPrice, setInputPrice] = useState(initialTokenPrice);
  const [balance, setBalance] = useState(1000);
  const [totalUSDCRequired, setTotalUSDCRequired] = useState<number>(calculateTotalFunds(tokenAmount));

  const height = 500;

  const resetValues = () => {
    setTokenAmount(initialTokenAmount);
    setCurrentSupply(initialTokenSupply);
    setNewSupply(initialTokenSupply + initialTokenAmount);
    setInputSupply(initialTokenSupply);
    setInputPrice(initialTokenPrice);
    setTotalUSDCRequired(calculateTotalFunds(initialTokenAmount));
  };

  const handleResize = () => {
    if (chartRef.current) {
      const containerWidth = chartRef.current.parentElement?.clientWidth || 700;
      setChartWidth(containerWidth);
    }
  };

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    handleResize();

    const svg = d3.select(chartRef.current)
      .attr('width', chartWidth)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(70, 50)`);

    const maxSupply = 7000;
    const maxPrice = 1400;

    const xScale = d3.scaleLinear()
      .domain([0, maxSupply])
      .range([0, chartWidth - 120]);

    const yScale = d3.scaleLinear()
      .domain([1, maxPrice])
      .range([height - 100, 0]);

    const supplyTickValues = [0, 1000, 2000, 3000, 4000, 5000, 6000, 7000];
    const priceTickValues = [1, 200, 400, 600, 800, 1000, 1200, 1400];

    svg.append('g')
      .attr('transform', `translate(0, ${height - 100})`)
      .call(d3.axisBottom(xScale)
        .tickValues(supplyTickValues)
        .tickFormat(d3.format(".0f"))
        .tickSize(-height + 90)
        .tickSizeOuter(6)
      )
      .attr('color', '#FFFFFF1A')
      .selectAll('.tick text')
      .attr('font-family', 'Montserrat, serif')
      .attr('fill', '#FFFFFF')
      .attr('font-size', '12px')
      .attr('dy', '0.7em')
      .attr('transform', 'translate(0, 10)');

    svg.append('g')
      .call(d3.axisLeft(yScale)
        .tickValues(priceTickValues)
        .tickFormat(d3.format(".0f"))
        .tickSize(-chartWidth + 120)
        .tickSizeOuter(6)
      )
      .attr('color', '#FFFFFF1A')
      .selectAll('.tick text')
      .attr('font-family', 'Montserrat, serif')
      .attr('fill', '#FFFFFF')
      .attr('font-size', '12px')
      .attr('dx', '-0.5em')
      .attr('dy', '0.35em');

    svg.append('text')
      .attr('transform', `translate(${(chartWidth - 120) / 2}, ${height - 60})`)
      .style('text-anchor', 'middle')
      .style('fill', '#FFFFFF99')
      .style('font-family', 'Montserrat, serif')
      .style('font-size', '13px')
      .attr('dy', '0.5em')
      .text('Supply');

    svg.append('text')
      .attr('transform', `translate(-60, ${(height - 100) / 2}) rotate(-90)`)
      .style('text-anchor', 'middle')
      .style('fill', '#FFFFFF99')
      .style('font-family', 'Montserrat, serif')
      .style('font-size', '13px')
      .text('Price (USDC)');

    const priceData = Array.from({ length: maxSupply + 1 }, (_, i) => i);

    const bondingCurveLine = d3.line<number>()
      .x((d, i) => xScale(i))
      .y((d) => yScale(Math.min(calculatePrice(d), maxPrice)))
      .curve(d3.curveMonotoneX);

    svg.append('path')
      .datum(priceData)
      .attr('fill', 'none')
      .attr('stroke', '#5C94CE')
      .attr('stroke-width', 2)
      .attr('d', bondingCurveLine);

    const hoverDot = svg.append('circle')
      .attr('r', 5)
      .attr('fill', 'rgba(0,0,0,0)')
      .attr('cursor', 'pointer')
      .style('opacity', 0);

    svg.on('mousemove', function (event) {
      const [mouseX] = d3.pointer(event);
      const hoveredSupply = Math.round(xScale.invert(mouseX));
      const priceAtSupply = calculatePrice(hoveredSupply);

      hoverDot
        .attr('cx', xScale(hoveredSupply))
        .attr('cy', yScale(priceAtSupply))
        .style('opacity', 1);
    });

    svg.on('mouseout', () => {
      hoverDot.style('opacity', 0);
    });

    svg.on('click', function (event) {
      const [mouseX, mouseY] = d3.pointer(event);
      const tolerance = 50; 
      let nearestSupply = null;
      let nearestDistance = Infinity;
    
      priceData.forEach((d) => {
        const supply = d;
        const price = calculatePrice(supply);
    
        const distance = Math.sqrt(
          Math.pow(mouseX - xScale(supply), 2) +
          Math.pow(mouseY - yScale(price), 2)
        );
    
        if (distance < nearestDistance && distance <= tolerance) {
          nearestSupply = supply;
          nearestDistance = distance;
        }
      });
    
      if (nearestSupply !== null) {
        const priceAtSupply = calculatePrice(nearestSupply);
        setCurrentSupply(nearestSupply);
        setInputSupply(nearestSupply);
        setInputPrice(priceAtSupply);
        setTotalUSDCRequired(calculateTotalFunds(nearestSupply));
      }
    });    

    const currentPrice = calculatePrice(currentSupply);
    const clampedSupply = currentSupply;
    const clampedPrice = Math.min(calculatePrice(clampedSupply), maxPrice);

    svg.append('line')
      .attr('x1', xScale(clampedSupply))
      .attr('y1', yScale(0))
      .attr('x2', xScale(clampedSupply))
      .attr('y2', yScale(maxPrice))
      .attr('stroke', '#FF4642')
      .attr('stroke-dasharray', '4,5')
      .attr('stroke-width', 1.5);

    svg.append('line')
      .attr('x1', xScale(0))
      .attr('y1', yScale(clampedPrice))
      .attr('x2', xScale(maxSupply))
      .attr('y2', yScale(clampedPrice))
      .attr('stroke', '#FF4642')
      .attr('stroke-dasharray', '4,5')
      .attr('stroke-width', 1.5);

    svg.append('circle')
      .attr('cx', xScale(clampedSupply))
      .attr('cy', yScale(clampedPrice))
      .attr('r', 7)
      .attr('fill', '#16F195')
      .attr('stroke', '#16F195');

    if (newSupply !== currentSupply) {
      const area = d3.area<number>()
        .x((d) => xScale(d))
        .y0((d) => yScale(calculatePrice(d)))
        .y1(height - 100);

      svg.append('path')
        .datum(priceData.slice(Math.min(currentSupply, newSupply), Math.max(currentSupply, newSupply) + 1))
        .attr('fill', newSupply > currentSupply ? 'rgba(22, 241, 149, 0.4)' : 'rgba(253, 105, 21, 0.4)')
        .attr('d', area);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      svg.selectAll('*').remove();
    };
  }, [currentSupply, newSupply, chartWidth]);

  const handleTokenAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const amount = parseInt(event.target.value, 10) || 0;
    setTokenAmount(amount);
    setNewSupply(currentSupply + amount);
    setTotalUSDCRequired(calculateTotalFunds(currentSupply + amount));
  };

  const handleTokenSupplyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const supply = parseInt(event.target.value, 10) || 0;
    const price = calculatePrice(supply);
    setInputSupply(supply);
    setCurrentSupply(supply);
    setInputPrice(price);
    setTotalUSDCRequired(calculateTotalFunds(supply));
  };

  const handleTokenPriceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const price = parseFloat(event.target.value) || 0;
    const supply = Math.round(calculateSupply(price));
    setInputPrice(price);
    setCurrentSupply(supply);
    setInputSupply(supply);
    setTotalUSDCRequired(calculateTotalFunds(supply));
  };

  const handlePresetClick = (usdc: number) => {
    const supply = Math.round(calculateSupply(usdc));
    setInputSupply(supply);
    setCurrentSupply(supply);
    setInputPrice(usdc);
    setTotalUSDCRequired(calculateTotalFunds(supply));
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
      <svg ref={chartRef}></svg>
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
        <label className={styles.inputLabel}>
          Total USDC Required:
          <input
            type="number"
            value={totalUSDCRequired.toFixed(2)}
            readOnly
            className={styles.inputField}
          />
        </label>
      </div>
      <div className={styles.presetButtons}>
        <button onClick={resetValues} className={styles.resetButton}>Reset</button>
        <button onClick={() => handlePresetClick(1)}>1 USDC</button>
        <button onClick={() => handlePresetClick(50)}>50 USDC</button>
        <button onClick={() => handlePresetClick(200)}>200 USDC</button>
      </div>
    </div>
  );
};

export default BondingCurveChart;
