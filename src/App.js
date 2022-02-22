import React, { useEffect, useState } from 'react';
import { domainContractAddress, tld } from './config';
import { ethers } from 'ethers';
import { networks } from './utils/networks';
import contractABI from './utils/Domains.json';
import binanceLogo from './assets/binancelogo.png';
import ethLogo from './assets/ethlogo.png';
import polygonLogo from './assets/polygonlogo.png';
import twitterLogo from './assets/twitter-logo.svg';
import './styles/App.css';
import { Grid } from 'react-loader-spinner';

const TWITTER_HANDLE = 'async_dime';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;
const TWITTER_LINK_BUILDSPACE = `https://twitter.com/_buildspace}`;

const App = () => {
  const [currentAccount, setCurrentAccount] = useState('');
  const [domain, setDomain] = useState('');
  const [record, setRecord] = useState('');
  const [network, setNetwork] = useState('');
  const [editing, setEditing] = useState(false);
  const [mints, setMints] = useState([]);
  const [loading, setLoading] = useState(false);

  const checkIfWalletIsConnected = async () => {
    // Make sure to have access of window.ethereum
    const { ethereum } = window;

    if (!ethereum) {
      alert('Please install MetaMask to use this app.');
      console.log('Make sure you have MetaMask!');
      return;
    } else {
      console.log('We have the ethereum object', ethereum);
    }

    const accounts = await ethereum.request({ method: 'eth_accounts' });

    // Users can have multiple authorized accounts, grab the first one
    if (accounts.length !== 0) {
      const account = accounts[0];
      console.log('Found an authorized account:', account);
      setCurrentAccount(account);
    } else {
      console.log('No authorized account found');
    }

    // Check the user's network chain ID
    const chainId = await ethereum.request({ method: 'eth_chainId' });
    setNetwork(networks[chainId]);

    ethereum.on('chainChanged', handleChainChanged);

    // Reload the page when user change networks
    function handleChainChanged(_chainId) {
      window.location.reload();
    }
  };

  const connectWallet = async () => {
    try {
      const { ethereum } = window;

      if (!ethereum) {
        alert('Get MetaMask -> https://metamask.io/');
        return;
      }

      const accounts = await ethereum.request({
        method: 'eth_requestAccounts',
      });

      console.log('Connected', accounts[0]);
      setCurrentAccount(accounts[0]);
    } catch (error) {
      console.log(error);
    }
  };

  const switchNetwork = async () => {
    if (window.ethereum) {
      try {
        // Try to switch to the Mumbai testnet
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x13881' }], // 0x13881 is hexadecimal for Mumbai testnet
        });
      } catch (error) {
        // This error code means that the chain we want has not been added to MetaMask
        // In this case we ask the user to add it to their MetaMask
        if (error.code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: '0x13881',
                  chainName: 'Polygon Mumbai Testnet',
                  rpcUrls: ['https://rpc-mumbai.maticvigil.com/'],
                  nativeCurrency: {
                    name: 'Mumbai Matic',
                    symbol: 'MATIC',
                    decimals: 18,
                  },
                  blockExplorerUrls: ['https://mumbai.polygonscan.com/'],
                },
              ],
            });
          } catch (err) {
            console.log(err);
          }
        }
        console.log(error);
      }
    } else {
      // If window.ethereum is not found then MetaMask is not installed
      alert(
        'MetaMask is not installed. Please install it to use this app: https://metamask.io/download.html'
      );
    }
  };

  const mintDomain = async () => {
    // if the domain is empty, don't run
    if (!domain) return;
    // alert user if the domain is too short
    if (domain.length < 3) {
      alert('Domain must be at least 3 characters long');
      return;
    }
    setLoading(true);
    // Calculate price based on the length of the domain
    // 3 chars = 0.5 MATIC, 4 chars = 0.3 MATIC, 5 chars or more = 0.1 MATIC
    const price = domain.length > 4 ? '0.1' : domain.length > 3 ? '0.3' : '0.5';
    console.log('Minting domain', `"${domain}.${tld}"`, 'with price', price);
    try {
      const { ethereum } = window;
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(
          domainContractAddress,
          contractABI.abi,
          signer
        );

        console.log('Going to pop wallet now to pay gas...');

        let tx = await contract.register(domain, {
          value: ethers.utils.parseEther(price),
        });
        // Wait for the transaction to be mined
        const receipt = await tx.wait();

        // Check if the transaction was successfully completed
        if (receipt.status === 1) {
          console.log(
            'Domain minted! https://mumbai.polygonscan.com/tx/' + tx.hash
          );

          // Set the record for the domain
          tx = contract.setRecord(domain, record);
          await tx.wait();

          console.log(
            'Record set! https://mumbai.polygonscan.com/tx/' + tx.hash
          );

          // Call fetchMints after 2 seconds
          setTimeout(() => {
            fetchMints();
          }, 2000);

          setRecord('');
          setDomain('');
        } else {
          alert('Transaction failed! Please try again');
        }
      }
    } catch (err) {
      console.log(err);
    }
    setLoading(false);
  };

  const fetchMints = async () => {
    try {
      const { ethereum } = window;
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(
          domainContractAddress,
          contractABI.abi,
          signer
        );

        // Get all the domain names from our contract
        const names = await contract.getAllNames();

        // For each name, get the record and the address
        const mintRecords = await Promise.all(
          names.map(async (name) => {
            const mintRecord = await contract.records(name);
            const owner = await contract.domains(name);
            return {
              id: names.indexOf(name),
              name: name,
              record: mintRecord,
              owner: owner,
            };
          })
        );

        console.log('MINTS FETCHED ', mintRecords);
        setMints(mintRecords);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const updateDomain = async () => {
    if (!record || !domain) {
      return;
    }
    setLoading(true);
    console.log('Updating domain', domain, 'with record', record);
    try {
      const { ethereum } = window;
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(
          domainContractAddress,
          contractABI.abi,
          signer
        );

        let tx = await contract.setRecord(domain, record);
        await tx.wait();
        console.log('Record set https://mumbai.polygonscan.com/tx/' + tx.hash);

        fetchMints();
        setRecord('');
        setDomain('');
      }
    } catch (err) {
      console.log(err);
    }
    setLoading(false);
  };

  // Create a function to render if wallet is not connected yet
  const renderNotConnectedContainer = () => (
    <div className="connect-wallet-container">
      <a
        href="https://giphy.com/gifs/chain-kinetictypography-creativetypography-RkW9Du6mqfkj1XEusR"
        target="_blank"
        rel="noreferrer"
      >
        <img src="https://i.imgur.com/KMc4Q70.gif" alt="Chain gif" />
      </a>
      <button
        onClick={connectWallet}
        className="cta-button connect-wallet-button"
      >
        Connect Wallet
      </button>
    </div>
  );

  // Form to enter domain name and data into contract
  const renderInputForm = () => {
    if (network !== 'Polygon Mumbai Testnet') {
      return (
        <div className="connect-wallet-container">
          <p>Please connect to the Polygon Mumbai Testnet</p>
          <button className="cta-button mint-button" onClick={switchNetwork}>
            Click here to switch
          </button>
        </div>
      );
    }

    return (
      <div className="form-container">
        <div className="first-row">
          <input
            type="text"
            value={domain}
            placeholder="domain"
            onChange={(e) => setDomain(e.target.value)}
          />
          <p className="tld"> .{tld} </p>
        </div>

        <input
          type="text"
          value={record}
          placeholder="what's your chain type?"
          onChange={(e) => setRecord(e.target.value)}
        />

        {/* If the editing variable is true, return the "Set record" and "Cancel" button */}
        {editing ? (
          <div className="button-container">
            {/* This will call the updateDomain function we just made */}
            {loading === true ? (
              <LoadingComponent />
            ) : (
              <button
                className="cta-button mint-button"
                disabled={loading}
                onClick={updateDomain}
              >
                Set record
              </button>
            )}

            {/* This will let us get out of editing mode by setting editing to
            false */}
            <button
              className="cta-button mint-button"
              onClick={() => {
                setEditing(false);
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          // If editing is not true, the mint button will be returned instead
          <div className="button-container">
            {loading === true ? (
              <LoadingComponent />
            ) : (
              <button
                className="cta-button mint-button"
                disabled={loading}
                onClick={mintDomain}
              >
                Mint
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  // Render minted domains
  const renderMints = () => {
    if (currentAccount && mints.length > 0) {
      return (
        <div className="mint-container">
          <p className="subtitle"> Recently minted domains!</p>
          <div className="mint-list">
            {mints.map((mint, index) => {
              return (
                <div className="mint-item" key={index}>
                  <div className="mint-row">
                    <a
                      className="link"
                      href={`https://testnets.opensea.io/assets/mumbai/${domainContractAddress}/${mint.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <p className="underlined">
                        {' '}
                        {mint.name}.{tld}{' '}
                      </p>
                    </a>
                    {/* If mint.owner is currentAccount, add an "edit" button*/}
                    {mint.owner.toLowerCase() ===
                    currentAccount.toLowerCase() ? (
                      <button
                        className="edit-button"
                        onClick={() => editRecord(mint.name)}
                      >
                        <img
                          className="edit-icon"
                          src="https://img.icons8.com/metro/26/000000/pencil.png"
                          alt="Edit button"
                        />
                      </button>
                    ) : null}
                  </div>
                  <p> {mint.record} </p>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
  };

  const LoadingComponent = () => (
    <div style={{ margin: '10px 0' }}>
      <Grid color="rgb(128, 128, 128)" height={80} width={80} />
    </div>
  );

  // This runs our function when the page loads.
  useEffect(() => {
    checkIfWalletIsConnected();
  }, []);

  // This will runs every time currentAccount or network changed
  useEffect(() => {
    if (network === 'Polygon Mumbai Testnet') {
      fetchMints();
    }
  }, [currentAccount, network]);

  // This will brings to edit mode and shows the edit buttons
  const editRecord = (name) => {
    console.log('Editing record for', name);
    setEditing(true);
    setDomain(name);
  };

  return (
    <div className="App">
      <div className="container">
        <div className="header-container">
          <header>
            <div className="left">
              <p className="title">🔗 Chain Name Service</p>
              <p className="subtitle">
                Blockchain's custom name, run on Polygon L2
              </p>
            </div>

            <div className="right">
              <img
                alt="Network logo"
                className="logo"
                src={
                  network.includes('Polygon')
                    ? polygonLogo
                    : network.includes('BSC')
                    ? binanceLogo
                    : ethLogo
                }
              />
              {currentAccount ? (
                <p>
                  {' '}
                  Wallet: {currentAccount.slice(0, 6)}...
                  {currentAccount.slice(-4)}{' '}
                </p>
              ) : (
                <p> Not connected </p>
              )}
            </div>
          </header>
        </div>

        {!currentAccount && renderNotConnectedContainer()}

        {currentAccount && renderInputForm()}

        {mints && renderMints()}

        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`A`}</a>
          &nbsp; X&nbsp;
          <a
            className="footer-text"
            href={TWITTER_LINK_BUILDSPACE}
            target="_blank"
            rel="noreferrer"
          >{`🦄`}</a>
        </div>
      </div>
    </div>
  );
};

export default App;
