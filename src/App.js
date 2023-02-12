import twitterLogo from './assets/twitter-logo.svg';
import './App.css';
import { useEffect, useState } from 'react';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { Program, AnchorProvider, web3 } from '@project-serum/anchor';
import { Buffer } from "buffer";
import kp from './assets/keypair.json'

window.Buffer = Buffer;

const TWITTER_HANDLE = '_buildspace';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

// const TEST_GIFS = [
//   "https://media.tenor.com/mesSGhgoTUcAAAAS/tribe-take-this.gif",
//   "https://media.tenor.com/lbEsggSJUOYAAAAd/solath-solana.gif",
//   "https://media.tenor.com/7VzBpq5zYR8AAAAd/eth.gif",
//   // "https://media.tenor.com/y6jv2TKUDMAAAAAC/crypto-dancing.gif",
//   "https://media.tenor.com/0oe3qWyqIbsAAAAC/pepe-meme.gif",
//   "https://media.tenor.com/MhKmHJYM4-EAAAAd/bep20token-development-blockchain-development-services.gif",
//   "https://media.tenor.com/ra4dKW9iSSEAAAAC/blockchain-cryptocurrency.gif"
// ]


// SystemProgram is a reference to the Solana runtime!
const { SystemProgram, Keypair } = web3;

// // Create a keypair for the account that will hold the GIF data.
// let baseAccount = Keypair.generate();

// Replacement for above lines
const arr = Object.values(kp._keypair.secretKey)
const secret = new Uint8Array(arr)
const baseAccount = Keypair.fromSecretKey(secret)

// This is the address of your solana program, if you forgot, just run solana address -k target/deploy/myepicproject-keypair.json
const programID = new PublicKey("6gFQc36zmVwiFpWpGoPGTgEXk3bCBThL8rpsvtvS9wrK");

// Set our network to devnet.
const network = clusterApiUrl('devnet');

// Controls how we want to acknowledge when a transaction is "done".
const opts = {
  preflightCommitment: "processed"
}



const App = () => {
  const [walletAddress, setWalletAddress] = useState(null)
  const [inputValue, setInputValue] = useState('');
  const [gifList, setGifList] = useState([]);
  const [selected, setSelected] = useState([]);


  const checkIfWalletIsConnected = async () => {
    if (window?.solana?.isPhantom) {
      console.log('Phantom wallet found!');
      const response = await window.solana.connect({ onlyIfTrusted: true });
      console.log(
        'Connected with Public Key:',
        response.publicKey.toString()
      );
      setWalletAddress(response.publicKey.toString())
    } else {
      alert('Solana object not found! Get a Phantom Wallet 👻');
    }    
  };

  const connectWallet = async () => {
    const { solana } = window;

    if (solana) {
      const response = await solana.connect();
      console.log('Connected with Public Key:', response.publicKey.toString());
      setWalletAddress(response.publicKey.toString());
    }
  }

  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new AnchorProvider(
      connection, window.solana, opts.preflightCommitment,
    );
    return provider;
  }


  const sendGif = async () => {
    if (inputValue.length === 0) {
      console.log("No gif link given!")
      return
    }
    console.log('Gif link:', inputValue);
    setInputValue('');
    try {
      const provider = getProvider()
      const program = await getProgram(); 
      
      await program.rpc.addGif(inputValue, {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        },
      });
      console.log("GIF successfully sent to program", inputValue)
      
      await getGifList();
    } catch (error) {
      console.log("Error sending GIF:", error)
    }
  };

  useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletIsConnected();
    };
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  const getProgram = async () => {
  // Get metadata about your solana program
    const idl = await Program.fetchIdl(programID, getProvider());
    // Create a program that you can call
    return new Program(idl, programID, getProvider());
  };

  const getGifList = async() => {
    try {
      const program = await getProgram(); 
      const account = await program.account.baseAccount.fetch(baseAccount.publicKey);
      
      console.log("Got the account", account)
      setGifList(account.gifList)

    } catch (error) {
      console.log("Error in getGifList: ", error)
      setGifList(null);
    }
  }

  const createGifAccount = async () => {
    try {
      const provider = getProvider();
      const program = await getProgram();
      
      console.log("ping")
      await program.rpc.initialize({
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [ baseAccount ]
      });
      console.log("Created a new BaseAccount w/ address:", baseAccount.publicKey.toString())
      await getGifList();

    } catch(error) {
      console.log("Error creating BaseAccount account:", error)
    }
  }

  useEffect(() => {
    if (walletAddress) {
      console.log('Fetching GIF list...');
      getGifList()
    }
  }, [walletAddress]);


  const handleSelect = addr => {
    if (!selected.includes(addr)) {
      setSelected([ ...selected, addr])
    }
  }


  const GifItem = (props) => {
    const { gif, idx } = props
    const userAddress = gif.userAddress.toString()
    const truncatedAddress = userAddress.slice(0, 8) + "........" + userAddress.slice(-8)
    const [ isHovered, setIsHovered ] = useState(false)
    const inSelected = selected.includes(userAddress)

    return (
      <div>
        <div className="gif-item" key={idx}>
          <img src={ gif.gifLink } alt="Not found" />
        </div>
        <div className='submitted-by'>
          {
            isHovered && (
              <div className='tool-tip user-address'>
                { userAddress  }
              </div>
            )
          }
          Submitted by: <i className={ `truncated-text ${ inSelected || isHovered && "clickable" }` }  
            onClick={() => handleSelect(userAddress)}
            onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
              { truncatedAddress }
            </i>
          {
            isHovered && !inSelected && (
              <div className='tool-tip msg'>
                Click to view this user's submissions.
              </div>
            )
          }
        </div>
      </div>
    )
  }

  // const dummyItems = [
  //   { 
  //     gifLink: "https://media.tenor.com/0oe3qWyqIbsAAAAC/pepe-meme.gif",
  //     userAddress: "asndbsahdgsdjsbdhsd6sasdsadasdsadasd7dyusabdhbjsdsd"
  //   }, 
  //   { 
  //     gifLink: "https://media.tenor.com/MhKmHJYM4-EAAAAd/bep20token-development-blockchain-development-services.gif",
  //     userAddress: "asndbsahdgsdjsbdhsd6sasdsadasdsadasd7dyusabdhbjsdsd"
  //   },
  //   { 
  //     gifLink: "https://media.tenor.com/5NluzBHDYmEAAAAM/millionsy-milli.gif",
  //     userAddress: "435sdfvsghdsdsd6s7adsadafdsrewrerdyusabdhbj67sa4syt"
  //   },
  // ]

  // const candidates = [ ...gifList, ...dummyItems ]

  const selectedItems = gifList.filter(item => selected.includes(item.userAddress.toString()))
  const otherItems = gifList.filter(item => !selected.includes(item.userAddress.toString()))


  return (
    <div className="App">
      <div className={ `container ${walletAddress && 'authed-container' }` }>
          <div className="header-container">
            <p className="header">🖼 GIF Portal</p>
            <p className="sub-text">
              All about Web3!!!
            </p>
            {
              !walletAddress ? (
                <button
                  className="cta-button connect-wallet-button"
                  onClick={ connectWallet }
                >
                  Connect to Wallet
                </button>
              ) : gifList === null ? (
                <div className="connected-container">
                  <button className="cta-button initialize-button" onClick={createGifAccount}>
                    Do One-Time Initialization For GIF Program Account
                  </button>
                </div>
              ) : (
                <div className="connected-container">
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      sendGif()
                    }}
                  >
                    <input type="text" placeholder="Enter gif link!" value={inputValue} onChange={e => setInputValue(e.target.value)}/>
                    <button type="submit" className="cta-button submit-gif-button">Submit</button>
                  </form>
                  <div className='results-container'>
                    {
                      selected?.length ? (
                        <>
                            <div className='pills-container'>
                              {
                                selected.map(i => (
                                  <div className='pills'>{ i } <span className='cross-button' onClick={() => setSelected(selected.filter(j => i !== j))}>x</span></div>
                                ))
                              }
                            </div>
                            <div className="gif-grid">
                              {
                                  selectedItems.map((gif, idx) => (
                                    <GifItem gif={ gif } idx={ idx } />
                                    ))
                                  }
                            </div>
                            { otherItems?.length ? <span className='pills others'>Others &nbsp;&nbsp;</span> : <></> }
                          </>
                        ) : <></>
                      }
                    <div className="gif-grid">
                      { 
                        otherItems.map((gif, idx) => (
                          <GifItem gif={ gif } idx={ idx } />
                          ))
                        }
                    </div>
                  </div>
                </div>
              )
            }
          </div>
          <div className="footer-container">
            <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
            <a
              className="footer-text"
              href={TWITTER_LINK}
              target="_blank"
              rel="noreferrer"
              >{`built on @${TWITTER_HANDLE}`}</a>
          </div>
          <div>
            <content></content>
          </div>
      </div>
    </div>
  );
};

export default App;
