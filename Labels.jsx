import React, { useState, useRef, useEffect, useCallback} from 'react';
import { Form, Button, Table, Modal } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import {convertToKg} from "shared/utils"
import { PackageRow } from './packageRow'; 
import { ThreeScene } from './3dModel';
// import { ThreeSceneOverpack } from './3dModelOverpack';
import compatibilityData from '../../../assets/incompatibilitytable.json';

// src\assets\incompatibilitytable.json

const PackageManagement = ({ neptuneData, activeButton }) => {
  const [form] = Form.useForm();
  const [packages, setPackages] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [open, setOpen] = useState(false);
  const [openOverpack, setOpenOverpack] = useState(false);
  const [currentPackage, setCurrentPackage] = useState(null);
  const [allBelowLimitedQuantity, setAllBelowLimitedQuantity] = useState(true);
  
  const [modalDimensions, setModalDimensions] = useState({width: 1200, height: 600})
  const modalRef = useRef();
  form.setFieldsValue({ packages: [{}] }); // Initialize the form with one empty package
  
  function checkCompatibility(class1, class2) {
    // Check if the first class exists in the data
    if (!compatibilityData.hasOwnProperty(class1)) {
      console.error(`Class ${class1} does not exist in compatibility data.`);
      return true; // If the class is not defined, assume it is compatible
    }
    
    // Check if the second class is defined within the first class's data
    if (compatibilityData[class1][class2] === undefined ) {
      return true; // If the compatibility is not explicitly marked, assume it is compatible
    }
  
    // Check if the compatibility is explicitly marked as "true"
    if (compatibilityData[class1][class2] === "true") {
      return true;
    } else {
      return false;
    }
  }

  function checkAllCompatibilities(packages, selectedRowKeys) {
    const allBelowLimitedQuantity = checkIsAllBelowLimitedQuantity(packages, selectedRowKeys);
  
    // If all packages are below their limited quantity, skip compatibility check
    if (allBelowLimitedQuantity) {
      setAllBelowLimitedQuantity(true);
      return true;
    }
  
    // Otherwise, proceed with compatibility check
    for (let i = 0; i < selectedRowKeys.length; i++) {
      for (let j = i + 1; j < selectedRowKeys.length; j++) {
        const package1 = packages[selectedRowKeys[i]];
        const package2 = packages[selectedRowKeys[j]];

        if (package1.un === package2.un) {
          continue; // Skip further checks and move to the next pair
        }
  
        // Check class1 to class2
        if (!checkCompatibility(package1.class, package2.class)) {
          alert(`Incompatible classes between ${package1.un} and ${package2.un}`);
          return false;
        }
  
        // Check class1 to subdivision2
        if (!checkCompatibility(package1.class, package2.division)) {
          alert(`Incompatible class of ${package1.un} and subdivision of ${package2.un}`);
          return false;
        }
  
        // Check subdivision1 to subdivision2
        if (!checkCompatibility(package1.division, package2.division)) {
          alert(`Incompatible subdivisions between ${package1.un} and ${package2.un}`);
          return false;
        }
  
        // Check subdivision1 to class2
        if (!checkCompatibility(package1.division, package2.class)) {
          alert(`Incompatible subdivision of ${package1.un} and class of ${package2.un}`);
          return false;
        }
      }
    }
  
    // If no incompatibilities are found, they are all compatible
    return true;
  }
  
  function checkIsAllBelowLimitedQuantity(packages, selectedRowKeys) {
    for (let i = 0; i < selectedRowKeys.length; i++) {
      const current_package = packages[selectedRowKeys[i]];
      const limitKg = convertToKg(current_package.limitedQuantity.value, current_package.limitedQuantity.unit, current_package.density);
      const isBelowLimitedQuantity = (Number(current_package.netMass) / Number(current_package.quantity)) <= limitKg;
  
      if (!isBelowLimitedQuantity) {
        setAllBelowLimitedQuantity(false);  // Set allBelowLimitedQuantity to false if any package is not below the limited quantity
        return false; // Return false immediately if any package is not below the limited quantity
      }
    }
    return true; // Return true if all packages are below their limited quantity
  }
  
  function checkBelowLimitedQuantity(record) {
    const limitKg = convertToKg(record.limitedQuantity.value, record.limitedQuantity.unit, record.density);
    const isBelowLimitedQuantity = (Number(record.netMass) / Number(record.quantity)) <= limitKg;
    return isBelowLimitedQuantity;

  }
  
  const updateModalDimensions = () => {
    if (modalRef.current) {
      const { clientWidth, clientHeight } = modalRef.current;
      setModalDimensions({ width: clientWidth, height: clientHeight });
      // console.log(modalDimensions);
    }
  };

  useEffect(() => {
    if (open || openOverpack) {
        // Small delay to ensure the modal has rendered
        const timer = setTimeout(() => {
            updateModalDimensions();
            window.dispatchEvent(new Event('resize'));
        }, 200);

        window.addEventListener('resize', updateModalDimensions);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', updateModalDimensions);
        };
    }
}, [open, openOverpack]);

  const onFinish = (values) => {
    setPackages(values.packages || []);
  };

  const onSelectChange = (newSelectedRowKeys) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
  };

  const addPackage = () => {
    let newPackages = form.getFieldValue('packages') || [];
    setPackages(prevPackages => [...prevPackages, ...newPackages]);
  };

  const removePackage = (selectedRowKeys) => {
    const numericKeys = selectedRowKeys.map(key => Number(key))
    const newPackages = packages.filter((_, index) => !numericKeys.includes(index));
    setPackages(newPackages);
  };

  const handleView3DModel = (record) => {
    setAllBelowLimitedQuantity(checkBelowLimitedQuantity(record));
    setCurrentPackage([record]);
    setOpen(true);
  };

  const overPack = () => {
    console.log(selectedRowKeys.length)
    console.log(packages[0].quantity)
    if (selectedRowKeys.length >= 2 || Number(packages[0].quantity) >= 2) {
      if (checkAllCompatibilities(packages, selectedRowKeys)) {
        console.log(allBelowLimitedQuantity)
        setOpenOverpack(true);
        // Force re-render of the 3D model
    }
    } else {
    alert('Please select at least 2 packages to overpack');
    return;
    }
  };

  const filteredPackages = selectedRowKeys.map(key => packages[key]);

  const columns = [
    { title: 'UN/ID No.', dataIndex: ['un'], key: 'un' },
    { title: 'Proper Shipping Name', dataIndex: ['shippingName'], key: 'shippingName' },
    { title: 'Density (S.G.)', dataIndex: ['density'], key: 'density' },
    { title: 'Class/Division (Subsidiary Risk)', dataIndex: ['class'], key: 'class' },
    { title: 'Packing Group', dataIndex: ['pkg'], key: 'pkg' },
    { title: 'Quantity & Type of Packing', dataIndex: ['quantity'], key: 'quantity' },
    { title: 'Gross Mass (kg)', dataIndex: ['grossMass'], key: 'grossMass' },
    { title: 'Net Mass (kg)', dataIndex: ['netMass'], key: 'netMass' },
    {
        title: '3D Model',
        key: '3dModel',
        render: (_, record) => (
          <Button type="primary" onClick={() => handleView3DModel(record)}>
            View 3D Model
          </Button>
        ),
      },
  ];

  return (
    <div>
      <Form 
        form={form} 
        onFinish={onFinish}
      >
        <table>
          <thead>
            <tr>
              <th></th>
              <th>UN/ID No.</th>
              <th>Proper Shipping Name</th>
              <th>Density (S.G.)</th>
              <th>Class/Division (Subsidiary Risk)</th>
              <th>Packing Group</th>
              <th>Quantity & Type of Packing</th>
              <th>Gross Mass (kg)</th>
              <th>Net Mass (kg)</th>
              <th>Cube (m³)</th>
              {/* <th>3D Model</th> */}
            </tr>
          </thead>
          <tbody>
            <Form.List name="packages">
              {(fields, { add, remove }) => (
                <>
                  {fields.map((field, index) => (
                    <PackageRow
                      key={field.key}
                      row={field}
                      add={add}
                      remove={remove}
                      index={index}
                      form={form}
                      neptuneData={neptuneData}
                      activeButton={activeButton}
                    />
                  ))}
                  <tr>
                    <td colSpan="11">
                      <Button type="dashed" onClick={() => addPackage()} block icon={<PlusOutlined />}>
                        Add Package
                      </Button>
                    </td>
                  </tr>
                </>
              )}
            </Form.List>
          </tbody>
        </table>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <Form.Item>
          <Button type="primary" onClick={() =>removePackage(selectedRowKeys)}>
            Remove selected
          </Button>
        </Form.Item>
        <Form.Item>
            <Button style={{backgroundColor: '#f87b05'}} onClick={() =>overPack()}>
                Overpack
            </Button>
            <Modal
            
					title="3D Model"
					centered
					open={openOverpack}
					onOk={() => setOpenOverpack(false)}
					onCancel={() => setOpenOverpack(false)}
					width={1200}
					ref={modalRef}
				>
					<div ref={modalRef} style={{ width: '100%', height: '100%' }}>
                        {openOverpack && (
                            <ThreeScene
                                key={`scene-${openOverpack}`}
                                modalDimensions={modalDimensions}
								                data={filteredPackages}
								                transMethod = {activeButton}
                                allBelowLimitedQuantity={allBelowLimitedQuantity}
                            />
                        )}
                    </div>
				</Modal>
        </Form.Item>
        </div>
      </Form>
      <Table 
        rowSelection={rowSelection}
        columns={columns}
        dataSource={packages} 
        rowKey={(record, index) => index.toString()}
      />

      <Modal
        title="3D Model"
        centered
        open={open}
        onOk={() => setOpen(false)}
        onCancel={() => setOpen(false)}
        width={1200}
        ref={modalRef}
      >
        <div ref={modalRef} style={{ width: '100%', height: '100%' }}>
          {open && (
            <ThreeScene
            key={`scene-${open}`}
              modalDimensions={modalDimensions} // You might want to adjust this
              data={currentPackage}
              transMethod={activeButton}
              isBelowLimitedQuantity={allBelowLimitedQuantity}
            />
          )}
        </div>
      </Modal>
    </div>
  );
};

export default PackageManagement;