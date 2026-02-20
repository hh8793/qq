import React from 'react';
import { Card, Row, Col, Statistic } from 'tdesign-react';
import { 
  UserIcon, 
  TransactionIcon, 
  CalendarIcon, 
  MoneyIcon 
} from 'tdesign-icons-react';

const Dashboard: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ marginBottom: '24px' }}>仪表盘</h1>
      
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总智能体数"
              value={156}
              prefix={<UserIcon />}
              trend="up"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总交易数"
              value={1248}
              prefix={<TransactionIcon />}
              trend="up"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="活跃订阅"
              value={89}
              prefix={<CalendarIcon />}
              trend="up"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总交易金额"
              value={2850.5}
              prefix={<MoneyIcon />}
              suffix="ETH"
              trend="up"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
        <Col span={12}>
          <Card title="最近交易" bordered>
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              交易图表组件（待实现）
            </div>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="系统状态" bordered>
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              系统监控组件（待实现）
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
