import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense, useRef, useEffect, useMemo, useState } from 'react';
import { useLoader } from '@react-three/fiber';
import { TextureLoader, CanvasTexture, Vector3 } from 'three';
import { useGLTF, OrbitControls, PerspectiveCamera, Html} from '@react-three/drei';
import {localize,convertToKg} from "shared/utils"
import { Checkbox } from 'antd';

// Model configurations for different packaging types
const packageTypes = {
  "1A1": 'Drum',
  "1A2": 'SteelDrumRemovableHead',
  "1B1": 'AluminiumDrum',
  "1B2": 'AluminiumDrum',
  "1N1": 'Drum',
  "1N2": 'Drum',
  "1G": 'WoodenDrum',
  "1D": 'Drum',
  "1H1" : 'PlasticDrum',
  "1H2" : 'PlasticDrum',
  "4A": 'Box',
  "4B": 'Box',
  "4N": 'Box',
  "4C1": 'Box',
  "4D": 'Box',
  "4F": 'Box',
  "4G": 'Box',
  "4H1": 'Box',
  "4H2": 'Box',
  "3A1": 'Jerrican',
  "3H1": 'Jerrican',
  "3B1": 'Jerrican', 
  "Box" : 'Box',
  "T01" : 'Tank',
  "T02" : 'Tank',
  "T03" : 'Tank',
  "T04" : 'Tank'
};
const packageModels = {
  Drum: {
    url: "src/assets/Models/Drum.glb"
  },
  SteelDrumRemovableHead: {
    url: "src/assets/Models/1A2_N2.glb"
  },
  PlasticDrum: {
    url: "src/assets/Models/PlasticDrum.glb"
  },
  AluminiumDrum: {
    url: "src/assets/Models/AluminiumDrum.glb"
  },
  WoodenDrum: {
    url: "src/assets/Models/WoodenDrum.glb"
  },
  Jerrican: {
    url: "src/assets/Models/Jerrican.glb"
  },
  Box: {
    url: "src/assets/Models/Box.glb"
  },
  Single: {
    url: "src/assets/Models/Box.glb"
  },
  Combination: {
    url: "src/assets/Models/Box.glb"
  },
  Tank: {
    url: "src/assets/Models/Container.glb"
  },
  Overpack: {
    url: "src/assets/Models/overpack.glb"
  }
};
const createTextTexture = (text, fontSize, width, height, verticalOffset = 0) => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  canvas.width = width;
  canvas.height = height;

  context.fillStyle = 'white';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = 'black';
  context.font = `Bold ${fontSize}px Arial`;
  context.textAlign = 'center';
  context.textBaseline = 'top';
  const verticalPosition = (canvas.height / 2) + verticalOffset;
  context.fillText(text, canvas.width / 2, verticalPosition);
  return new CanvasTexture(canvas);
};
const hovertext = {
  UN_number: `The UN number and the letters “UN” must be at least 12 mm high, except for
packages of 30 litres capacity or less or of 30 kg maximum net mass and for
cylinders of 60 litres water capacity or less when they must be at least 6 mm in
height and except for packages of 5 litres capacity or less or 5 kg maximum net
mass when they must be of an appropriate size.`,
Net_quantity: `- The net quantity must be marked adjacent to the UN number and the Proper
Shipping Name.
- Required when transporting by air.`,
Orientation_arrow_front: `When package orientation “This Way Up” labels are required, at least two of these
labels must be used. One label must be affixed to each of the two opposite sides of
the package, with the arrows pointing in the upright position.`,
Orientation_arrow_side: `When package orientation “This Way Up” labels are required, at least two of these
labels must be used. One label must be affixed to each of the two opposite sides of
the package, with the arrows pointing in the upright position.`,
DG_class : `The label must be in the form of a square set at an angle of 45 degrees (diamond-
shaped). The minimum dimensions must be 100 mm x 100 mm. There must be a
line inside the edge forming the diamond which must be parallel and approximately 5
mm from the outside of that line to the edge of the label.`,
Aircraft_only : `When a “Cargo Aircraft Only” label is required, it must be affixed on the same
surface of the package near the hazard label(s).
 Required when transporting by air.`,
Limited_quantity : `The mark must be in the form of a square set at an angle of 45 degrees (diamond-
shaped). The top and bottom portions and the surrounding line must be black. The
centre area must be white or a suitable contrasting background. The minimum
dimensions must be 100 mm x 100 mm and the minimum width of the line forming
the diamond must be 2 mm. Only when transporting by air, the symbol “Y” must be
placed in the centre of the mark and must be clearly visible.`
}

function Model({ modelConfig, textureUrls, textMappings, setClicked, rotationSpeed, isBelowLimitedQuantity, transparentParts, overpack}) {
  const { scene } = useGLTF(modelConfig.url, true);
  const textures = useLoader(TextureLoader, Object.values(textureUrls));
  const groupRef = useRef();
  const { camera, raycaster, mouse } = useThree();

  // Calculate the font size based on the length of the text
  const calculateFontSize = (text) => {
    const baseSize = 50; // Base font size
    const length = text.length || 1;
    const size = Math.min(baseSize - (length/1.9), 50);
    return size;
  };

  const fontsize = calculateFontSize(textMappings.UN_number || ' ') || 48

  const fontSizeMap = {
    UN_number: overpack? fontsize : 60,
    UN_number_radioactive: 90, 
    UN_number_battery: 55,
    Net_quantity: 50,
    PSN: 35,
    Excepted_class: 200,
    Shipper_address: 38,
    Consignee_address: 35,
    Technical_name: 33
  };
  // Mapping the dimensions of the text to the corresponding labels
  const dimMap = {
    // Width, Height, Vertical Offset
    UN_number: overpack? [600,100,-10] : [500, 120, -3],
    Net_quantity: [600,100, -30],
    Shipper_address: [600, 120, -20],
    Consignee_address: [600, 120, -20],
    PSN: overpack? [570, 100, -15] : [500, 80, -15],
    UN_number_battery: [500, 100, 0],
    Excepted_class: [600,300, -10],
    Technical_name: overpack? [620, 80, -17] : [330, 80, -15],
  }
// Creating the text textures.
  const textTextures = useMemo(() => {
    if (Object.keys(textMappings).length > 0) {
        return Object.fromEntries(
            Object.entries(textMappings).map(([key, value]) => {
                const fontSize = fontSizeMap[key] || 48;
                const [width, height, verticalOffset] = dimMap[key] || [500, 150,0];
                return [key, createTextTexture(value, fontSize, width, height, verticalOffset)];
            })
        );
    }
    return {};
}, [modelConfig, textureUrls, textMappings]); 

// Mapping the textures and text to their corresponding labels
useEffect(() => {
  scene.traverse(child => {
    if (child.isMesh) {
      // Make every label transparent first
      if (transparentParts.includes(child.name)) {
        child.material.transparent = true;
        child.material.opacity = 0;
      }
      // Map the textures to the corresponding labels
      if (textureUrls[child.name]) {
        child.material.opacity = 1;
        child.material.map = textures[Object.keys(textureUrls).indexOf(child.name)];
        child.material.needsUpdate = true;
      }
      // Map the text textures to the corresponding spaces
      if (textTextures[child.name]) {
        child.material.opacity = 1;
        child.material.map = textTextures[child.name];
        child.material.transparent = true;
        child.material.needsUpdate = true;
      }
      // Hiding UN certification label for limited quantities
      if (isBelowLimitedQuantity && child.name === 'UN_certification') {
        child.visible = false;
      } else if (child.name === 'UN_certification') {
        child.visible = true;
      }
    }
  });
  // Cleanup after dismount
  return() => {
    textures.forEach(texture => texture.dispose());
  };

}, [scene, textures, textureUrls, textTextures, isBelowLimitedQuantity]);

// Spinning the model (if enabled)
useFrame(() => {
  if (groupRef.current) {
    groupRef.current.rotation.y += rotationSpeed;
  }
});
// Showing the additional info on click
const handleClick = (event) => {
  event.stopPropagation();
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(groupRef.current.children, true);

  if (intersects.length > 0) {
    const clickedObject = intersects[0].object;
    setClicked({
      position: clickedObject.getWorldPosition(new Vector3()),
      name: clickedObject.name
    });
  } else {
    setClicked(null);
  }
};

return (
  <group ref={groupRef} onClick={handleClick}>
    <primitive object={scene} scale={1} />
  </group>
);
}

export function ThreeScene({modalDimensions, data, transMethod, isBelowLimitedQuantity}) {
  const [clicked, setClicked] = useState(null);
  const [rotationEnabled, setRotationEnabled] = useState(true);
  let textureUrls = {};
  let textMappings = {};
  let modelConfig;
  let transparentParts = [];
  let overpack = false;

// In the case of viewing 3d model of a single package.
  if (data.length <= 1) {
      data = data[0];
      // Everything that needs to be hidden before mapping so we dont get blank textures
      transparentParts = [
        'DG_class','DG_subrisk1','DG_subrisk2','DG_subrisk3','Environ_haz', 'Limited_quantity','Orientation_arrow_front',
        'Orientation_arrow_side', 'Aircraft_only', 'Magnetized_material', 'Cryogenic_liquids', 
        'Battery_mark','UN_number_battery', 'Net_quantity','Away_from_heat','Radioactive_excepted',
        'Shipper_address','Consignee_address','Technical_name','UN_number_radioactive','Excepted_class','Excepted_quantity','UN_number','PSN','Technical_name','UN_number'];
      // Extracting the data from the package
      const hazardclass  = data?.class || 0;
      const subdivision = data?.division || 0;
      const un = data?.un || '0010';
      const outerPackaging = data?.outerPackaging || data?.singlePackaging || '4G';
      const netMass = data?.netMass || 0;
      const packagingInstructions = data?.packagingInstructions || 'P001';
      const packagingInstruction = packagingInstructions.split(' ')[0];
      
      // Extracting first character of the outer package codes (1A1, 1B2) etc
      const extractFirstReferenceCode = (packagingString) => {
        const match = packagingString.match(/\(([^)]+?)\)/);
        if (match) {
          const codes = match[1].split(',').map(code => code.trim());
          return codes[0] || null;
        }
        return packagingString;
      };
      // Getting the packaging code from the package type ie. 1A1 = Drum
      const packagingCode = packageTypes[extractFirstReferenceCode(outerPackaging)] || 'Box';

      // If above the limited quantity, show the labels, un number, etc.
      if (!isBelowLimitedQuantity) {
        textureUrls = {
          DG_class: `src/assets/ADRbook/${hazardclass}.png`,
          DG_subrisk1: `src/assets/ADRbook/${subdivision}.png`
        };
        textMappings = {
          UN_number: `UN ${un}`,
          PSN: 'PROPER SHIPPING NAME'
        };
      }
      // Else just map the limited quantity label
      else {
        textureUrls.Limited_quantity = 'src/assets/Labels/LQ.png';
      }
      // Old code for the different transport methods, not sure if this will be used in the future
    switch (transMethod) {
      case 'road':
        break;
      case 'rail':
        break;
      case 'sea':
        if (netMass > 50) {
          textMappings.Net_quantity = `NET QUANTITY: ${netMass} kg`;
        }
        break;
      case 'air':
        textureUrls = {
          DG_class: `src/assets/ADRbook/${hazardclass}.png`,
          DG_subrisk1: `src/assets/ADRbook/${subdivision}.png`
        };
        textureUrls.Aircraft_only = 'src/assets/Labels/Air.png';
        Object.assign(textMappings, {
          Net_quantity: `NET QUANTITY: ${netMass}kg`,
          Shipper_address: 'SHIPPER NAME AND ADDRESS',
          Consignee_address: 'CONSIGNEE NAME AND ADDRESS',
          UN_number: `UN ${un}`,
          PSN: 'PROPER SHIPPING NAME'
        });
        // Magnets
        if (un === '2807') {
          textureUrls.Magnetized_material = 'src/assets/Labels/Magnetized.png';
        }
        // Keep away from heat
        if (hazardclass === '4.1' || hazardclass === '5.2' || subdivision === '4.1' || subdivision === '5.2') {
          textureUrls.Away_from_heat = 'src/assets/Labels/away_from_heat.jpg';
        }
        // Radioactive excepted
        if (hazardclass === '7' || subdivision === '7') {
          textureUrls.Radioactive_excepted = 'src/assets/Labels/Radioactive_excepted.jpg';
          textMappings.UN_number_radioactive = `UN ${un}`;
        }
        // Limited quantities
        if (Number(data.netMass)/Number(data.quantity) < data.limitedQuantity.value) {
          textureUrls.Limited_quantity = 'src/assets/Labels/LQ_air.png';
        }
        break;
    }
    // Orientation arrow for Liquids
      if (packagingInstruction === 'P001' && data.singlePackaging === undefined  && Number(data.netMass)/Number(data.quantity) > 0.12) {
        textureUrls.Orientation_arrow_side = 'src/assets/Labels/OA.jpg';
        textureUrls.Orientation_arrow_front = 'src/assets/Labels/OA.jpg';  
      }
      // Infectious substances orientation arrow
      if ((hazardclass === '6.2' || subdivision === '6.2') && Number(data.netMass)/Number(data.quantity) > 0.05)  {
        textureUrls.Orientation_arrow_side = 'src/assets/Labels/OA.jpg';
        textureUrls.Orientation_arrow_front = 'src/assets/Labels/OA.jpg';  
      }
      // Batteries
      const battery_uns = ['3090','3091','3480','3481','3536']
      if (battery_uns.includes(un)) {
        textureUrls.DG_class = 'src/assets/ADRbook/9A.png';
        textureUrls.Battery_mark = 'src/assets/Labels/battery.png';
        textMappings.UN_number_battery = `UN ${un}`;
      }
      if (data.packagingFormat === 'Excepted Quantity') {
        textureUrls.Excepted_quantity = 'src/assets/Labels/Excepted_quantity.jpg';
        textMappings.Excepted_class = `${hazardclass}`;
      }
      if (hazardclass === '7' || subdivision === '7') {
        textMappings.Shipper_address = 'SHIPPER NAME AND ADDRESS',
        textMappings.Consignee_address = 'CONSIGNEE NAME AND ADDRESS'
      }
      if ((hazardclass === '7' || subdivision === '7') && Number(data.netMass)/Number(data.quantity) > 50) {
        textMappings.Net_quantity = `NET QUANTITY: ${netMass}kg`;
      }
      if (data.technicalNameRequired && !isBelowLimitedQuantity) {
        textMappings.Technical_name = '(TECHNICAL NAME)';
      }
      modelConfig = packageModels[packagingCode] || packageModels[0];
    } else {  // Overpack section for multiple packages
      let unNumbers = [];
      let unNumberBattery = [];
      let bothbelowlimitedquantity = true;
      overpack = true;

      transparentParts = ['DG_class_3','DG_class_6_1','DG_class_6_2','Limited_quantity','DG_class_8',
        'DG_class_9','DG_class_9A','DG_class_5_1','DG_class_5_2','DG_class_7','DG_class_1','DG_class_2_1',
        'DG_class_2_2','DG_class_4_1','DG_class_2_3','DG_class_4_2','DG_class_4_3','Environ_haz',
        'Orientation_arrow_side','Battery_mark','UN_number_battery', 'PSN','UN_number','Technical_name']

      // Looping through each package, extracting the data and creating the textures
      data.forEach((pkg) => {
        const hazardClass = pkg.class || 0;
        const hazardClassNoDot = hazardClass.toString().replace('.', '_') || hazardClass;
        const subdivision = pkg.division || 0;
        const subdivisionNoDot = subdivision.toString().replace('.', '_') || subdivision;
        const packagingInstructions = pkg?.packagingInstructions || 'P001';
        const packagingInstruction = packagingInstructions.split(' ')[0];
        const un = pkg.un || '0010';
        unNumbers.push(`UN ${un}`);
        
        // Check if the package is below the limited quantity, if exists in the package, if not calculate it.
        const limitKg = convertToKg(pkg.limitedQuantity.value, pkg.limitedQuantity.unit, pkg.density)
        const isBelowLimitedQuantity = pkg.IsLimitedQuantity || (Number(pkg.netMass) / Number(pkg.quantity) < limitKg);
        const battery_uns = ['3090','3091','3480','3481','3536']
        
        if (isBelowLimitedQuantity) {
          textureUrls.Limited_quantity = 'src/assets/Labels/LQ.png';
        } else {
          if (hazardClass && !battery_uns.includes(un)) {
            textureUrls[`DG_class_${hazardClassNoDot}`] = `src/assets/ADRbook/${hazardClass}.png`;
          }
          if (subdivision) {
            textureUrls[`DG_class_${subdivisionNoDot}`] = `src/assets/ADRbook/${subdivision}.png`;
          }
          bothbelowlimitedquantity = false;
          textMappings.PSN = 'ALL PROPER SHIPPING NAMES';
        }
        // Orientation arrow for Liquids if above 120ml
        if (packagingInstruction === 'P001' && Number(pkg.netMass) / Number(pkg.quantity) > 0.12) {
          textureUrls['Orientation_arrow_side'] = 'src/assets/Labels/OA.jpg';
        }
        //   // Batteries
        if (battery_uns.includes(un)) {
          textureUrls.DG_class_9A = 'src/assets/ADRbook/9A.png';
          textureUrls.Battery_mark = 'src/assets/Labels/battery.png';
          unNumberBattery.push(`UN ${un}`);
          const uniqueBatteryUnNumbers = [...new Set(unNumberBattery)]; // Remove duplicates
          textMappings.UN_number_battery= uniqueBatteryUnNumbers.join(', ');
        }
        //  Technical names (if available) for N.O.S. packages
        if (pkg.technicalNameRequired && !bothbelowlimitedquantity) {
          textMappings.PSN = 'ALL PROPER SHIPPING NAMES',
          textMappings.Technical_name = 'with their technical names, if available';
        }
      });

      if (!bothbelowlimitedquantity) {
        const uniqueUnNumbers = [...new Set(unNumbers)]; // Remove duplicates
        textMappings.UN_number = uniqueUnNumbers.join(', ');
      }
      modelConfig = packageModels['Overpack'] || packageModels[0];
    } //end of switch case for overpack or not
      
  return (
    <div>
    <Canvas style={{ width: modalDimensions.width, height: modalDimensions.height }}>
      <PerspectiveCamera makeDefault position={[80, 50, 50]} fov={3} />
      <ambientLight intensity={0.7} /> 
      <directionalLight position={[0, 20, 10]} intensity={0.8} castShadow />
      <directionalLight position={[-20, 10, 5]} intensity={0.6} /> 
      <directionalLight position={[20, 10, -5]} intensity={0.5} /> 
      <directionalLight position={[0, -10, -10]} intensity={0.5} />
      <Suspense fallback={null}>
        <Model 
          modelConfig={modelConfig} 
          textureUrls={textureUrls} 
          textMappings={textMappings}
          setClicked={setClicked}
          rotationSpeed={rotationEnabled ? 0.01 : 0}
          isBelowLimitedQuantity={isBelowLimitedQuantity}
          transparentParts={transparentParts}
          overpack={overpack}
        />
      </Suspense>
      {clicked && (
        <Html position={clicked.position} style={{ pointerEvents: 'none' }}>
          <div style={{ 
            backgroundColor: 'white', 
            padding: '10px', 
            borderRadius: '5px',
            boxShadow: '0 0 10px rgba(0,0,0,0.5)',
            pointerEvents: 'none',
            width: '400px',
            textOverflow: 'ellipsis'
          }}>
            <h3>{clicked.name}</h3>
            <p>{hovertext[clicked.name] || "No additional info available for this item"}</p>
          </div>
        </Html>
      )}
      <OrbitControls />
    </Canvas>
    <Checkbox
        checked={rotationEnabled}
        onChange={(e) => setRotationEnabled(e.target.checked)}
      >
        Enable 360 Rotation
      </Checkbox>
    </div>
  );
}