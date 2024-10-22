import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import styles from '../styles/Chart.module.scss';

const BondingCurveChart: React.FC = () => {
  const initialPrice = 1;
  const k = 0.001;

  const calculatePrice = (supply: number): number => initialPrice * Math.exp(k * supply);
  const calculateTotalFunds = (supply: number): number => (initialPrice / k) * (Math.exp(k * supply) - 1);
  const calculateTradeFunds = (initSupply: number, delta: number): number =>
    calculateTotalFunds(initSupply + delta) - calculateTotalFunds(initSupply);

  const chartRef = useRef<SVGSVGElement | null>(null);
  const [chartWidth, setChartWidth] = useState<number>(700);
  const [currentSupply, setCurrentSupply] = useState(500);
  const [mintAmount, setMintAmount] = useState(0);
  const [newSupply, setNewSupply] = useState(currentSupply);
  const [totalUSDCRequired, setTotalUSDCRequired] = useState<number>(calculateTotalFunds(currentSupply));
  const [tradeUSDCRequired, setTradeUSDCRequired] = useState<number>(0);

  const height = 500;

  const handleResize = () => {
    if (chartRef.current) {
      const containerWidth = chartRef.current.parentElement?.clientWidth || 700;
      setChartWidth(containerWidth);
    }
  };

  const resetValues = () => {
    setMintAmount(0);
    setCurrentSupply(500);
    setNewSupply(500);
    setTotalUSDCRequired(calculateTotalFunds(500));
    setTradeUSDCRequired(0);
  };

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    handleResize();

    const svg = d3.select(chartRef.current)
      .attr('width', chartWidth)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${chartWidth < 500 ? 40 : 70}, 50)`);

    let maxSupply = Math.max(currentSupply, newSupply) * 1.3;
    if (maxSupply < 2200) {
      maxSupply = 2200;
    }

    const maxPrice = calculatePrice(maxSupply);

    const xScale = d3.scaleLinear()
      .domain([0, maxSupply])
      .range([0, chartWidth - (chartWidth < 500 ? 80 : 120)]);

    const yScale = d3.scaleLinear()
      .domain([0, maxPrice])
      .range([height - 100, 0]);

    const xAxis = d3.axisBottom(xScale)
      .ticks(Math.min(maxSupply / 200, 10))
      .tickFormat(d3.format(".0f"));

    const yAxis = d3.axisLeft(yScale).ticks(10);

    svg.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0, ${height - 100})`)
      .call(d3.axisBottom(xScale)
        .ticks(15)
        .tickSize(-height + 100)
        .tickFormat(() => '')
      )
      .attr('color', '#FFFFFF1A');

    svg.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(yScale)
        .ticks(10)
        .tickSize(-chartWidth + (chartWidth < 500 ? 80 : 120))
        .tickFormat(() => '')
      )
      .attr('color', '#FFFFFF1A');

    svg.append('g')
      .attr('transform', `translate(0, ${height - 100})`)
      .call(xAxis)
      .attr('color', '#FFFFFF1A')
      .selectAll('.tick text')
      .attr('font-family', 'Montserrat, serif')
      .attr('fill', '#FFFFFF')
      .attr('font-size', chartWidth < 500 ? '10px' : '12px')
      .attr('dy', '0.7em')
      .attr('transform', 'translate(0, 10)');

    svg.append('g')
      .call(yAxis)
      .attr('color', '#FFFFFF1A')
      .selectAll('.tick text')
      .attr('font-family', 'Montserrat, serif')
      .attr('fill', '#FFFFFF')
      .attr('font-size', chartWidth < 500 ? '10px' : '12px')
      .attr('dx', '-0.5em')
      .attr('dy', '0.35em');

    svg.append('text')
      .attr('transform', `translate(${(chartWidth - (chartWidth < 500 ? 80 : 120)) / 2}, ${height - 60})`)
      .style('text-anchor', 'middle')
      .style('fill', '#FFFFFF99')
      .style('font-family', 'Montserrat, serif')
      .style('font-size', chartWidth < 500 ? '10px' : '13px')
      .attr('dy', '0.8em')
      .text('Supply');

    svg.append('text')
      .attr('transform', `translate(${chartWidth < 500 ? -30 : -60}, ${(height - 100) / 2}) rotate(-90)`)
      .style('text-anchor', 'middle')
      .style('fill', '#FFFFFF99')
      .style('font-family', 'Montserrat, serif')
      .style('font-size', chartWidth < 600 ? '10px' : '13px')
      .text('Price (USDC)');

    const priceData = Array.from({ length: maxSupply + 1 }, (_, i) => i);

    const bondingCurveLine = d3.line<number>()
      .x((d) => xScale(d))
      .y((d) => yScale(calculatePrice(d)));

    svg.append('path')
      .datum(priceData)
      .attr('fill', 'none')
      .attr('stroke', '#5C94CE')
      .attr('stroke-width', 2)
      .attr('d', bondingCurveLine);

    svg.append('circle')
      .attr('cx', xScale(currentSupply))
      .attr('cy', yScale(calculatePrice(currentSupply)))
      .attr('r', 6)
      .attr('fill', '#008FFB');

    const isIncrease = newSupply >= currentSupply;
    const newPointColor = isIncrease ? "#00E396" : "#FF4560";

    svg.append('circle')
      .attr('cx', xScale(newSupply))
      .attr('cy', yScale(calculatePrice(newSupply)))
      .attr('r', 6)
      .attr('fill', newPointColor);

    const area = d3.area<number>()
      .x((d) => xScale(d))
      .y0(height - 100)
      .y1((d) => yScale(calculatePrice(d)));

    svg.append('path')
      .datum(priceData.slice(Math.min(currentSupply, newSupply), Math.max(currentSupply, newSupply) + 1))
      .attr('fill', isIncrease ? '#00E39650' : '#FF456050')
      .attr('d', area);

    svg.on('click', function (event) {
      const [mouseX] = d3.pointer(event);
      const clickedSupply = Math.round(xScale.invert(mouseX));

      const delta = clickedSupply - currentSupply;
      setNewSupply(clickedSupply);
      setMintAmount(delta);
      setTotalUSDCRequired(calculateTotalFunds(clickedSupply));
      setTradeUSDCRequired(calculateTradeFunds(currentSupply, delta));
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      svg.selectAll('*').remove();
    };
  }, [currentSupply, newSupply, chartWidth]);

  const handleSupplyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const supply = parseFloat(event.target.value) || 0;
    const delta = supply - currentSupply;
    setCurrentSupply(supply);
    setNewSupply(supply + mintAmount);
    setTotalUSDCRequired(calculateTotalFunds(supply + mintAmount));
    setTradeUSDCRequired(calculateTradeFunds(supply, delta));
  };

  const handleMintAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const amount = parseFloat(event.target.value) || 0;
    setMintAmount(amount);
    setNewSupply(currentSupply + amount);
    setTotalUSDCRequired(calculateTotalFunds(currentSupply + amount));
    setTradeUSDCRequired(calculateTradeFunds(currentSupply, amount));
  };

  return (
    <div className={styles.chartLayout}>
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
        <svg ref={chartRef} className={styles.mainChartSvg}></svg>
      </div>
      <div className={styles.formContainer}>
      <div className={styles.inputContainer}>
          <label className={styles.inputLabel}>
            Supply:
            <input
              type="number"
              value={currentSupply}
              onChange={handleSupplyChange}
              className={styles.inputField}
            />
          </label>
          <label className={styles.inputLabel}>
            Mint Amount (Delta):
            <input
              type="number"
              value={mintAmount}
              onChange={handleMintAmountChange}
              className={styles.inputField}
            />
          </label>
          <label className={styles.inputLabel}>
            New Supply:
            <input
              type="number"
              value={newSupply}
              readOnly
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
          <label className={styles.inputLabel}>
            Trade USDC Required (Δ):
            <input
              type="number"
              value={tradeUSDCRequired.toFixed(2)}
              readOnly
              className={styles.inputField}
            />
          </label>
        </div>
        <div className={styles.presetButtons}>
          <button onClick={resetValues} className={styles.resetButton}>Reset</button>
        </div>
      </div>
    </div>
  );
};

export default BondingCurveChart;
