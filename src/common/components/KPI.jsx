import {
  Box, Stack, Text, useColorModeValue,
} from '@chakra-ui/react';
import PropTypes from 'prop-types';
import Heading from './Heading';
import Icon from './Icon';

const KPI = ({
  label, icon, value, unit, max,
  variation, variationColor, style,
  changeWithColor,
}) => {
  const verifiVariation = () => {
    if (variation.includes('+')) return 'up';
    if (variation.includes('-')) return 'down';
    return false;
  };
  const kpiPositions = {
    up: 'scaleY(-1)',
    down: 'scaleY(1)',
    default: false,
  };
  const kpiColors = {
    up: '#25BF6C',
    '+': '#25BF6C',
    down: '#CD0000',
    '-': '#CD0000',
    default: '#0097CF',
  };

  const textColor = useColorModeValue('gray.900', 'white');
  const labelColor = useColorModeValue('gray.dark', 'gray.light');
  const bgColor = useColorModeValue('white', 'featuredDark');

  const kpiColor = kpiColors[verifiVariation()];
  const defaultColor = kpiColors.default;
  const kpiPosition = kpiPositions[verifiVariation()] || kpiPositions.default;
  const isPositiveColor = max !== null
    && value >= (max * 0.8)
    && kpiColors.up; // value is greather than 80% of max

  const getNumberColor = () => {
    if (max === null) return changeWithColor ? kpiColor : textColor;
    return isPositiveColor || kpiColor;
  };
  const numberColors = getNumberColor();

  return (
    <Stack style={style} width="fit-content" background={bgColor} display="flex" flexDirection="column" padding="17px 22px" border="2px solid" borderColor="blue.200" borderRadius="10px">
      <Heading as="label" color={labelColor} textTransform="capitalize" fontSize="14px">
        {label}
      </Heading>
      <Box display="flex" alignItems="center" style={{ margin: '6px 0 0 0' }} gridGap="10px">
        {icon && (
          <Icon icon={icon} color={variationColor || (numberColors || kpiColor || textColor)} width="26px" height="26px" />
        )}
        <Box display="flex" gridGap="6px">
          <Heading as="p" size="m" padding="0" margin="0" color={numberColors}>
            {unit}
            {value}
            {/* {value.toString().length >= 3
              ? (value).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
              : value} */}
          </Heading>
          {max && (
            <>
              <Heading as="label" size="m" fontWeight="400" color="gray.default">
                /
              </Heading>
              <Heading as="p" size="m" fontWeight="400" padding="0" margin="0" color="gray.default">
                {max}
              </Heading>
            </>
          )}
        </Box>
        {variation && (
          <Box display="flex" flexDirection="row" alignItems="center">
            {kpiPosition && (
              <Box transition="all 0.3s ease-in-out" height="20px" transform={kpiPosition}>
                <Icon icon="arrowDown" color={kpiColor || defaultColor} width="20px" height="20px" />
              </Box>
            )}
            <Text as="label" color={kpiColor || defaultColor} fontSize="15px" fontWeight="700">
              {`${variation.replace('+', '').replace('-', '')}%`}
            </Text>
          </Box>
        )}
      </Box>
    </Stack>
  );
};

KPI.propTypes = {
  label: PropTypes.string.isRequired,
  icon: PropTypes.string,
  value: PropTypes.number,
  unit: PropTypes.string,
  max: PropTypes.number,
  variation: PropTypes.string,
  variationColor: PropTypes.string,
  style: PropTypes.objectOf(PropTypes.any),
  changeWithColor: PropTypes.bool,
  // variationUnit: PropTypes.string.isRequired,
};

KPI.defaultProps = {
  icon: '',
  value: 0,
  unit: '',
  max: null,
  variation: '',
  variationColor: '',
  style: {},
  changeWithColor: false,
  // variationUnit: '',
};

export default KPI;
