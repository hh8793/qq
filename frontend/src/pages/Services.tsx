import React, { useState } from 'react';
import {
  Table,
  Button,
  Space,
  Dialog,
  Form,
  Input,
  Select,
  InputNumber,
  MessagePlugin,
  Switch,
  Tag,
} from 'tdesign-react';
import { PlusIcon, EditIcon } from 'tdesign-icons-react';

const { FormItem } = Form;

interface Service {
  id: number;
  provider: string;
  serviceType: string;
  pricePerUnit: string;
  pricingType: string;
  isAvailable: boolean;
  createdAt: string;
}

const Services: React.FC = () => {
  const [services] = useState<Service[]>([
    {
      id: 1,
      provider: '内容创作智能体 Gamma',
      serviceType: '文章生成',
      pricePerUnit: '0.5',
      pricingType: 'PER_UNIT',
      isAvailable: true,
      createdAt: '2024-01-15',
    },
    {
      id: 2,
      provider: '算力服务智能体 Delta',
      serviceType: '算力服务包',
      pricePerUnit: '15.0',
      pricingType: 'FIXED',
      isAvailable: true,
      createdAt: '2024-01-16',
    },
    {
      id: 3,
      provider: '营销智能体 Alpha',
      serviceType: '线索生成（按效付费）',
      pricePerUnit: '2.0',
      pricingType: 'PERFORMANCE_BASED',
      isAvailable: false,
      createdAt: '2024-01-17',
    },
    {
      id: 4,
      provider: '数据分析智能体 Epsilon',
      serviceType: '月度数据分析',
      pricePerUnit: '10.0',
      pricingType: 'SUBSCRIPTION',
      isAvailable: true,
      createdAt: '2024-01-18',
    },
  ]);

  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const columns = [
    {
      colKey: 'id',
      title: 'ID',
      width: 80,
    },
    {
      colKey: 'provider',
      title: '提供者',
      width: 180,
    },
    {
      colKey: 'serviceType',
      title: '服务类型',
      width: 200,
    },
    {
      colKey: 'pricePerUnit',
      title: '单价',
      width: 100,
      cell: ({ row }: { row: Service }) => `${row.pricePerUnit} ETH`,
    },
    {
      colKey: 'pricingType',
      title: '定价类型',
      width: 120,
      cell: ({ row }: { row: Service }) => {
        const typeMap: Record<string, string> = {
          FIXED: '固定价格',
          PER_UNIT: '按量计费',
          PERFORMANCE_BASED: '按效付费',
          SUBSCRIPTION: '订阅制',
        };
        return <Tag theme="primary">{typeMap[row.pricingType] || row.pricingType}</Tag>;
      },
    },
    {
      colKey: 'isAvailable',
      title: '可用状态',
      width: 100,
      cell: ({ row }: { row: Service }) => {
        return row.isAvailable ? (
          <Tag theme="success">可用</Tag>
        ) : (
          <Tag theme="default">不可用</Tag>
        );
      },
    },
    {
      colKey: 'createdAt',
      title: '创建时间',
      width: 120,
    },
    {
      colKey: 'action',
      title: '操作',
      width: 150,
      cell: ({ row }: { row: Service }) => (
        <Space>
          <Button
            size="small"
            variant="text"
            theme="primary"
            icon={<EditIcon />}
            onClick={() => handleEdit(row)}
          >
            编辑
          </Button>
        </Space>
      ),
    },
  ];

  const handleAdd = () => {
    setEditingService(null);
    setDialogVisible(true);
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setDialogVisible(true);
  };

  const handleSubmit = (values: any) => {
    console.log('Form values:', values);
    MessagePlugin.success(editingService ? '更新成功' : '创建成功');
    setDialogVisible(false);
  };

  const pricingTypeOptions = [
    { value: 'FIXED', label: '固定价格' },
    { value: 'PER_UNIT', label: '按量计费' },
    { value: 'PERFORMANCE_BASED', label: '按效付费' },
    { value: 'SUBSCRIPTION', label: '订阅制' },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h1>服务管理</h1>
        <Button
          theme="primary"
          icon={<PlusIcon />}
          onClick={handleAdd}
        >
          新增服务
        </Button>
      </div>

      <Table
        data={services}
        columns={columns}
        rowKey="id"
        bordered
        hover
      />

      <Dialog
        header={editingService ? '编辑服务' : '新增服务'}
        visible={dialogVisible}
        onClose={() => setDialogVisible(false)}
        width={600}
        footer={null}
      >
        <Form onSubmit={handleSubmit}>
          <FormItem name="provider" label="提供者" initialData={editingService?.provider}>
            <Input placeholder="请输入提供者" />
          </FormItem>
          <FormItem name="serviceType" label="服务类型" initialData={editingService?.serviceType}>
            <Input placeholder="请输入服务类型" />
          </FormItem>
          <FormItem name="pricePerUnit" label="单价（ETH）" initialData={editingService?.pricePerUnit}>
            <InputNumber placeholder="请输入单价" min={0} step={0.1} />
          </FormItem>
          <FormItem name="pricingType" label="定价类型" initialData={editingService?.pricingType}>
            <Select
              placeholder="请选择定价类型"
              options={pricingTypeOptions}
            />
          </FormItem>
          <FormItem name="isAvailable" label="可用状态" initialData={editingService?.isAvailable ?? true}>
            <Switch />
          </FormItem>
          <FormItem>
            <Space>
              <Button theme="primary" type="submit">
                确定
              </Button>
              <Button
                variant="outline"
                onClick={() => setDialogVisible(false)}
              >
                取消
              </Button>
            </Space>
          </FormItem>
        </Form>
      </Dialog>
    </div>
  );
};

export default Services;
