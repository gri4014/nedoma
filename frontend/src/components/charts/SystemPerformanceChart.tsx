import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { Card } from '../common/Card';
import { LoadingSpinner } from '../common/LoadingSpinner';
import api from '../../services/api';

const ChartContainer = styled(Card)`
  padding: ${({ theme }) => theme.spacing.lg};
  height: 400px;
  width: 100%;
  background: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  box-shadow: ${({ theme }) => theme.shadows.sm};
`;

const ChartTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSizes.lg};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  font-weight: 500;
`;

const ChartHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

interface SystemMetric {
  timestamp: string;
  responseTime: number;
  successRate: number;
  cpuUsage: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '8px 12px',
          border: '1px solid #f0f0f0',
          borderRadius: '4px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}
      >
        <p style={{ margin: 0, color: '#666' }}>
          <strong>{label}</strong>
        </p>
        <p style={{ margin: '4px 0 0', color: '#1a73e8' }}>
          Response Time: {payload[0].value}ms
        </p>
        <p style={{ margin: '4px 0 0', color: '#34a853' }}>
          Success Rate: {payload[1].value}%
        </p>
        <p style={{ margin: '4px 0 0', color: '#fbbc04' }}>
          CPU Usage: {payload[2].value}%
        </p>
      </div>
    );
  }
  return null;
};

export const SystemPerformanceChart: React.FC = () => {
  const [data, setData] = useState<SystemMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Simulated data for now - will be replaced with actual API call
        const mockData = Array.from({ length: 24 }, (_, i) => {
          const hour = new Date();
          hour.setHours(hour.getHours() - (23 - i));
          return {
            timestamp: hour.toLocaleTimeString('en-US', { hour: '2-digit' }),
            responseTime: Math.floor(Math.random() * 100) + 50,
            successRate: 95 + Math.random() * 5,
            cpuUsage: Math.floor(Math.random() * 30) + 20
          };
        });
        setData(mockData);
      } catch (error) {
        console.error('Failed to fetch system performance data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <ChartContainer>
        <ChartHeader>
          <ChartTitle>System Performance</ChartTitle>
        </ChartHeader>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
          <LoadingSpinner />
        </div>
      </ChartContainer>
    );
  }

  return (
    <ChartContainer>
      <ChartHeader>
        <ChartTitle>System Performance</ChartTitle>
      </ChartHeader>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#f0f0f0"
          />
          <XAxis
            dataKey="timestamp"
            tick={{ fill: '#666', fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#f0f0f0' }}
          />
          <YAxis
            tick={{ fill: '#666', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="responseTime"
            stroke="#1a73e8"
            fill="#1a73e820"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="successRate"
            stroke="#34a853"
            fill="#34a85320"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="cpuUsage"
            stroke="#fbbc04"
            fill="#fbbc0420"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};
