import React from 'react';
import PropTypes from 'prop-types';
import render from '../app-target';
import styles from './credits.css';

import {APP_NAME, ABOUT_TEXT, SOURCE_CODE_URL} from '../../lib/brand';
import {applyGuiColors} from '../../lib/themes/guiHelpers';
import {detectTheme} from '../../lib/themes/themePersistance';
import UserData from './users';

/* eslint-disable react/jsx-no-literals */

applyGuiColors(detectTheme());
// ekole: the Blocs Ékole section is in French, upstream credits stay in English
document.documentElement.lang = 'fr';

const User = ({image, text, href}) => (
    <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={styles.user}
    >
        <img
            loading="lazy"
            className={styles.userImage}
            src={image}
            width="60"
            height="60"
        />
        <div className={styles.userInfo}>
            {text}
        </div>
    </a>
);
User.propTypes = {
    image: PropTypes.string.isRequired,
    text: PropTypes.string.isRequired,
    href: PropTypes.string
};

const UserList = ({users}) => (
    <div className={styles.users}>
        {users.map((data, index) => (
            <User
                key={index}
                {...data}
            />
        ))}
    </div>
);
UserList.propTypes = {
    users: PropTypes.arrayOf(PropTypes.object)
};

const Credits = () => (
    <main className={styles.main}>
        <header className={styles.headerContainer}>
            <h1 className={styles.headerText}>
                À propos de {APP_NAME}
            </h1>
        </header>
        {/* ekole: required notice and link to the corresponding source code (GPL-3.0) */}
        <section>
            <p>
                {ABOUT_TEXT}
            </p>
            <p>
                <a href={SOURCE_CODE_URL}>Code source</a> de {APP_NAME} : logiciel libre sous licence GNU GPL v3,
                comme TurboWarp.
            </p>
        </section>
        <section lang="en">
            <h2>Credits</h2>
            <p>
                The {APP_NAME} project is made possible by the work of many volunteers.
            </p>
        </section>
        {APP_NAME !== 'TurboWarp' && (
            // Be kind and considerate. Don't remove this :)
            <section lang="en">
                <h2>TurboWarp</h2>
                <p>
                    {APP_NAME} is based on <a href="https://turbowarp.org/">TurboWarp</a>.
                </p>
            </section>
        )}
        <section lang="en">
            <h2>Scratch</h2>
            <p>
                {APP_NAME} is based on the work of the <a href="https://scratch.mit.edu/credits">Scratch contributors</a> but is not endorsed by Scratch in any way.
            </p>
        </section>
        <section lang="en">
            <h2>Contributors</h2>
            <UserList users={UserData.contributors} />
        </section>
        <section lang="en">
            <h2>Addons</h2>
            <UserList users={UserData.addonDevelopers} />
        </section>
        <section lang="en">
            <h2>TurboWarp Extension Gallery</h2>
            <UserList users={UserData.extensionDevelopers} />
        </section>
        <section lang="en">
            <h2>Documentation</h2>
            <UserList users={UserData.docs} />
        </section>
        <section lang="en">
            <h2>Translators</h2>
            <p>
                More than 100 people have helped translate {APP_NAME} and its addons into many languages
                &mdash; far more than we could hope to list here.
            </p>
        </section>
        <section lang="en">
            <p>
                <i>
                    Individual contributors are listed in no particular order.
                    The order is randomized each visit.
                </i>
            </p>
        </section>
    </main>
);

render(<Credits />);
