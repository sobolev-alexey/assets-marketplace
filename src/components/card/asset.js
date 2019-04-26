import React from 'react';
// import ReactGA from 'react-ga';
import styled from 'styled-components';
import format from 'date-fns/format';
// import Clipboard from 'react-clipboard.js';
// import { Link } from 'react-router-dom';
import { connect } from 'react-redux';
// import { getZip } from '../../utils/zip';
import Card from './index.js';

// const trackDownload = ({ assetId }) => {
//   ReactGA.event({
//     category: 'Download script',
//     action: 'Download script',
//     label: `Asset ID ${assetId}`
//   });
// }

const Heading = ({ assetId, assetName, type }, func) => (
  <Full>
    <AssetCategory>Offer</AssetCategory>
    {/* <Link to={`/asset/${assetId}`}> */}
      <AssetId>{assetName.length > 20 ? `${assetName.substr(0, 20)}...` : assetName}</AssetId>
    {/* </Link> */}
    <Delete onClick={() => func(assetId)}>
      <IconButton src="/static/icons/icon-delete.svg" />
    </Delete>
  </Full>
);

// const Footer = (asset, provider) => (
//   <div onClick={() => trackDownload(asset) || getZip(asset, provider)}>
//     <FootRow>
//       <FooterButton>Download Publish Script</FooterButton>
//     </FootRow>
//   </div>
// );

const Asset = props => {
  // const [message, setMessage] = useState('');
  const { asset } = props;

  // function alert(message) {
  //   setMessage(message);
  //   setTimeout(() => setMessage(''), 1500)
  // };

  return (
    <Card
      header={Heading(asset, props.delete)}
      // footer={Footer(asset, provider)}
    >
      <RowFull>
        <RowDesc>Asset Description:</RowDesc>
        <Data>{asset.assetDescription}</Data>
      </RowFull>
      <Row>
        <RowHalf>
          <RowDesc>Asset Type:</RowDesc>
          <Data>{asset.type}</Data>
        </RowHalf>
        <RowHalf>
          <RowDesc>Owner:</RowDesc>
          <Data>{asset.company}</Data>
        </RowHalf>
      </Row>
      <Row>
        <RowHalf>
          <RowDesc>Begin Time:</RowDesc>
          <Data>{format(asset.startTimestamp, 'HH:mm - DD.MM.YY')}</Data>
        </RowHalf>
        <RowHalf>
          <RowDesc>End Time:</RowDesc>
          <Data>{format(asset.endTimestamp, 'HH:mm - DD.MM.YY')}</Data>
        </RowHalf>
      </Row>
      <Row>
        <RowHalf>
          <RowDesc>Location</RowDesc>
          <Data>
            {asset.location.city && asset.location.country
              ? `${asset.location.city}, ${asset.location.country}`
              : '--'}
          </Data>
        </RowHalf>
        <RowHalf>
          <RowDesc>Price:</RowDesc>
          <Data>{asset.price}</Data>
        </RowHalf>
      </Row>
      {/* <RowHalf>
        <RowDesc>Asset ID:</RowDesc>
        <Clipboard
          style={{ background: 'none', display: 'block' }}
          data-clipboard-text={asset.assetId}
          onSuccess={() => alert('Successfully Copied')}
        >
          <CopyBox>{asset.assetId && `${asset.assetId.substr(0, 15)}...`}</CopyBox>
        </Clipboard>
      </RowHalf>
      <RowHalf>
        <RowIcon src="/static/icons/icon-key.svg" alt="" />
        <RowDesc>Asset secret key:</RowDesc>
        <Clipboard
          style={{ background: 'none', display: 'block' }}
          data-clipboard-text={asset.sk}
          onSuccess={() => alert('Successfully Copied')}
        >
          <CopyBox>{asset.sk && `${asset.sk.substr(0, 15)}...`}</CopyBox>
        </Clipboard>
      </RowHalf>
      <Alert message={message}>{message}</Alert> */}
    </Card>
  );
};

const mapStateToProps = state => ({
  settings: state.settings,
});

export default connect(mapStateToProps)(Asset);

const Row = styled.div`
  display: flex;
  justify-content: space-between;
  &:not(:last-of-type) {
    margin-bottom: 5px;
  }
`;

const RowFull = styled.div`
  padding: 5px 30px;
  display: inline-block;
  text-align: left;
  width: 100%;

  @media (max-width: 400px) {
    border: none;
    padding-left: 20px;
    padding-right: 0;
  }
`;

const RowHalf = styled.div`
  padding: 5px 30px;
  display: inline-block;
  &:last-child {
    text-align: right;
  }

  &:first-of-type {
    @media (max-width: 400px) {
      border: none;
      width: 140px;
      padding-left: 20px;
      padding-right: 0;
    }
  }
`;

const Data = styled.p`
  font-size: 18px;
  line-height: 30px;
  margin-top: 4px;
`;

// const CopyBox = styled(Data)`
//   cursor: pointer;
//   transition: all 0.3s ease;
//   &:hover {
//     opacity: 0.6;
//   }
// `;

const RowDesc = styled.span`
  ${'' /* margin-left: 5px; */}
  font: 12px/16px 'Nunito Sans', sans-serif;
  color: #808b92;
`;

// const RowIcon = styled.img`
//   position: relative;
//   top: 1px;
// `;

// const FootRow = styled.div`
//   display: flex;
//   justify-content: space-between;
//   &:not(:last-of-type) {
//     margin-bottom: 5px;
//   }
// `;

const AssetCategory = styled.span`
  font: 16px 'Nunito Sans', sans-serif;
  text-transform: uppercase;
  position: absolute;
  top: -8px;
  color: #808b92;
`;

// const AssetType = styled.span`
//   font: 12px/16px 'Nunito Sans', sans-serif;
//   position: absolute;
//   top: -8px;
//   color: #808b92;
// `;

const AssetId = styled.span`
  font-size: 24px;
  top: 6px;
  line-height: 42px;
  position: relative;
  color: #009fff;
`;

const Full = styled.div`
  width: 100%;
`;

const Delete = styled.span`
  position: absolute;
  display: flex;
  align-items: center;
  top: 10px;
  right: 30px;
`;

const IconButton = styled.img`
  height: 20px;
  width: 20px;
  cursor: pointer;
  opacity: 1;
  transition: all 0.3s ease;
  &:hover {
    opacity: 0.4;
  }
`;

// const FooterButton = styled.button`
//   color: ${props => (props.grey ? `rgba(41, 41, 41, 0.4)` : `rgba(41, 41, 41, 0.9)`)};
//   padding: 5px 15px;
//   margin-right: -15px;
//   font-size: 90%;
//   background: transparent;
//   &:first-of-type {
//     margin-left: -15px;
//     margin-right: 0;
//   }
// `;

// const Alert = styled.span`
//   font-size: 16px;
//   line-height: 32px;
//   color: #595959ff;
//   opacity: ${props => (props.message ? 1 : 0)};
//   transition: all 0.5s ease;
// `;